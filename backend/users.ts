import express from 'express';
import { randomUUID } from 'node:crypto';
import { addAuditLog } from './serverUtils.js';
import {
  loadLiveUsers,
  saveUserDirect,
  saveAuditLogDirect,
  deleteUserDirect,
} from './mysqlReplica.js';
import {
  User,
  AuditLog,
  DEFAULT_ROLE_PERMISSIONS,
} from '../frontend/src/app/types.js';

const MAX_SYSTEM_ADMINISTRATORS = 3;
const withoutCredentials = (user: User) => {
  const { password: _password, temporaryPasswordExpiresAt: _expires, ...safe } =
    user;
  return safe;
};

export function createUsersRouter(
  getUsersState: () => User[],
  setUsersState: (users: User[]) => void,
  getAuditLogsState: () => AuditLog[],
  syncEmployeeProfile: (user: User) => void,
) {
  const router = express.Router();
  const getActingUser = (req: express.Request) =>
    getUsersState().find(
      (user) => user.id === String(req.get('X-User-Id') || '') && user.active,
    );

  // GET Users
  router.get('/', async (req, res) => {
    try {
      const liveUsers = await loadLiveUsers();
      if (liveUsers) {
        const databaseUsers = liveUsers as User[];
        setUsersState(databaseUsers);
        // User accounts are the source of truth for BLGF Personnel. Recreate
        // any missing profile by permanent user ID, including legacy accounts
        // that existed before automatic directory synchronization.
        databaseUsers.forEach(syncEmployeeProfile);
      }
      const actingUser = getActingUser(req);
      if (!actingUser) return res.json([]);
      const visibleUsers =
        actingUser.role === 'SYSTEM_ADMIN'
          ? getUsersState()
          : getUsersState().filter((user) => user.active);
      res.json(visibleUsers.map(withoutCredentials));
    } catch (error) {
      console.error('[GET /api/users] Live MySQL read failed:', error);
      // The in-memory state was loaded from the same database at startup.
      // Keep the UI usable during a transient read error instead of returning
      // a 500/503 loop to the browser.
      const actingUser = getActingUser(req);
      if (!actingUser) return res.json([]);
      const visibleUsers =
        actingUser.role === 'SYSTEM_ADMIN'
          ? getUsersState()
          : getUsersState().filter((user) => user.active);
      res.json(visibleUsers.map(withoutCredentials));
    }
  });

  // POST Create User
  router.post('/', async (req, res) => {
    const body = req.body;
    const usersState = getUsersState();
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    if (actingUser.role !== 'SYSTEM_ADMIN') {
      return res.status(403).json({ error: 'System Administrator access required.' });
    }

    if (
      body.role === 'SYSTEM_ADMIN' &&
      usersState.filter((user) => user.role === 'SYSTEM_ADMIN').length >=
        MAX_SYSTEM_ADMINISTRATORS
    ) {
      return res.status(403).json({
        error: 'A maximum of three System Administrator accounts is allowed.',
      });
    }
    const username = String(body.username || '').trim();
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    if (
      usersState.some(
        (user) => user.username.trim().toLowerCase() === username.toLowerCase(),
      )
    ) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    const newUser: User = {
      id: `usr-${randomUUID()}`,
      username,
      password: body.password,
      fullName: body.fullName,
      email: body.email,
      role: body.role || 'STAFF',
      divisionCode:
        body.role === 'ADMIN'
          ? 'AD'
          : body.role === 'SYSTEM_ADMIN'
            ? 'ITMS'
            : body.divisionCode || 'AD',
      designation: body.designation || 'Staff Member',
      contactNo: body.contactNo || '',
      avatarUrl: body.avatarUrl,
      permissions:
        body.permissions ||
        structuredClone(
          DEFAULT_ROLE_PERMISSIONS[body.role || 'STAFF'] ||
            DEFAULT_ROLE_PERMISSIONS.STAFF,
        ),
      active: true,
      createdAt: new Date().toISOString(),
    };

    setUsersState([...usersState, newUser]);

    const auditLog = addAuditLog(getAuditLogsState(), {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: 'CREATE_USER',
      details: `Created new user account: ${newUser.fullName} (${newUser.username}) - Role: ${newUser.role}`,
      ipAddress: req.ip || '127.0.0.1',
    });

    try {
      await Promise.all([
        saveUserDirect(newUser),
        saveAuditLogDirect(auditLog),
      ]);
    } catch (error) {
      setUsersState(usersState.filter((user) => user.id !== newUser.id));
      const message = error instanceof Error ? error.message : String(error);
      return res
        .status(message.includes('Unique constraint') ? 409 : 500)
        .json({
          error: message.includes('Unique constraint')
            ? 'Username already exists'
            : 'Failed to save the user account.',
        });
    }
    syncEmployeeProfile(newUser);
    res.status(201).json(withoutCredentials(newUser));
  });

  // PUT Update User
  router.put('/:id', async (req, res) => {
    const usersState = getUsersState();
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    const uIdx = usersState.findIndex((u) => u.id === req.params.id);
    if (uIdx === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    const isSelfUpdate = actingUser.id === req.params.id;
    if (!isSelfUpdate && actingUser.role !== 'SYSTEM_ADMIN') {
      return res.status(403).json({ error: 'System Administrator access required.' });
    }
    const isSystemAdministrator = usersState[uIdx].role === 'SYSTEM_ADMIN';
    const requestedCurrentPassword = String(req.body.currentPassword || '');
    const updates = { ...req.body };
    delete updates.currentPassword;
    if ('password' in updates) {
      const nextPassword = String(updates.password || '').trim();
      if (nextPassword) {
        updates.password = nextPassword;
      } else {
        // A blank password means "keep the current password". Never allow a
        // profile-only update to erase the stored login credential.
        delete updates.password;
      }
    }
    if (isSelfUpdate && actingUser.role !== 'SYSTEM_ADMIN') {
      delete updates.role;
      delete updates.divisionCode;
      delete updates.permissions;
      delete updates.active;
    }
    if (
      isSystemAdministrator &&
      req.body.role &&
      req.body.role !== 'SYSTEM_ADMIN'
    ) {
      return res.status(403).json({
        error: 'System Administrator roles cannot be reassigned.',
      });
    }
    if (
      !isSystemAdministrator &&
      req.body.role === 'SYSTEM_ADMIN' &&
      usersState[uIdx].role !== 'SYSTEM_ADMIN' &&
      usersState.filter((user) => user.role === 'SYSTEM_ADMIN').length >=
        MAX_SYSTEM_ADMINISTRATORS
    ) {
      return res.status(403).json({
        error: 'A maximum of three System Administrator accounts is allowed.',
      });
    }
    const username = String(
      updates.username ?? usersState[uIdx].username,
    ).trim();
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    const usernameChanged =
      username.toLowerCase() !== usersState[uIdx].username.trim().toLowerCase();
    if (
      usernameChanged &&
      usersState.some(
        (user, index) =>
          index !== uIdx &&
          user.username.trim().toLowerCase() === username.toLowerCase(),
      )
    ) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    if (updates.password) {
      const administratorResettingAnotherUser =
        actingUser.role === 'SYSTEM_ADMIN' && !isSelfUpdate;
      if (!administratorResettingAnotherUser && !requestedCurrentPassword) {
        return res.status(400).json({ error: 'Current password is required.' });
      }
      if (
        !administratorResettingAnotherUser &&
        usersState[uIdx].password &&
        usersState[uIdx].password !== requestedCurrentPassword
      ) {
        return res
          .status(401)
          .json({ error: 'Current password is incorrect.' });
      }
      updates.temporaryPasswordExpiresAt = null;
    }

    const previousUser = { ...usersState[uIdx] };
    const updatedUser = {
      ...usersState[uIdx],
      ...updates,
      username,
    };

    if (updatedUser.role === 'ADMIN') {
      updatedUser.divisionCode = 'AD';
      if (!updates.permissions) {
        updatedUser.permissions = structuredClone(
          DEFAULT_ROLE_PERMISSIONS.ADMIN,
        );
      }
    }
    if (updatedUser.role === 'SYSTEM_ADMIN') {
      updatedUser.divisionCode = 'ITMS';
    }
    const newUsersState = usersState.map((u) =>
      u.id === req.params.id ? updatedUser : u,
    );
    setUsersState(newUsersState);

    const auditLog = addAuditLog(getAuditLogsState(), {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: 'UPDATE_USER',
      details: `Updated account details for ${updatedUser.fullName}`,
      ipAddress: req.ip || '127.0.0.1',
    });

    try {
      await Promise.all([
        saveUserDirect(updatedUser),
        saveAuditLogDirect(auditLog),
      ]);
    } catch (error) {
      setUsersState(
        usersState.map((u) => (u.id === req.params.id ? previousUser : u)),
      );
      const message = error instanceof Error ? error.message : String(error);
      return res
        .status(message.includes('Unique constraint') ? 409 : 500)
        .json({
          error: message.includes('Unique constraint')
            ? 'Username already exists'
            : 'Failed to update the user account.',
        });
    }
    syncEmployeeProfile(updatedUser);
    res.json(withoutCredentials(updatedUser));
  });

  // DELETE User
  router.delete('/:id', async (req, res) => {
    const usersState = getUsersState();
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    if (actingUser.role !== 'SYSTEM_ADMIN') {
      return res.status(403).json({ error: 'System Administrator access required.' });
    }
    const accountToDelete = usersState.find(
      (user) => user.id === req.params.id,
    );
    if (accountToDelete?.role === 'SYSTEM_ADMIN') {
      return res.status(403).json({
        error: 'System Administrator accounts cannot be deleted.',
      });
    }
    const index = usersState.findIndex((u) => u.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'User not found' });

    const originalUsers = [...usersState];
    const deleted = usersState[index];
    setUsersState(usersState.filter((u) => u.id !== req.params.id));

    const auditLog = addAuditLog(getAuditLogsState(), {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: 'UPDATE_USER',
      details: `Deleted user account: ${deleted.fullName}`,
      ipAddress: req.ip || '127.0.0.1',
    });

    try {
      await Promise.all([
        deleteUserDirect(deleted.id),
        saveAuditLogDirect(auditLog),
      ]);
    } catch (error) {
      setUsersState(originalUsers);
      return res
        .status(500)
        .json({ error: 'Failed to delete the user account.' });
    }
    res.json({ success: true });
  });

  return router;
}
