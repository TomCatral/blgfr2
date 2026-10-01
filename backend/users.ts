import express from 'express';
import crypto, { randomUUID } from 'node:crypto';
import { addAuditLog } from './serverUtils.js';
import {
  loadLiveUsers,
  saveUserDirect,
  saveAuditLogDirect,
  deleteUserDirect,
  updateUserPassword,
} from './mysqlReplica.js';
import {
  sendPasswordUpdatedEmail,
  sendTemporaryPasswordEmail,
} from './emailService.js';
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
  syncEmployeeProfile: (user: User, persist?: boolean) => void,
) {
  const router = express.Router();
  const getActingUser = (req: express.Request) =>
    getUsersState().find(
      (user) => user.id === String(req.get('X-User-Id') || '') && user.active !== false,
    );

  const canManageUsers = (user?: User): boolean => {
    if (!user) return false;
    return user.role === 'SYSTEM_ADMIN';
  };

  const hasUserAction = (user: User | undefined, action: string): boolean => {
    if (!user) return false;
    if (user.role === 'SYSTEM_ADMIN') return true;
    if (action.startsWith('USER_')) return false;
    const permissions =
      user.permissions ||
      DEFAULT_ROLE_PERMISSIONS[user.role] ||
      DEFAULT_ROLE_PERMISSIONS.STAFF;
    return Boolean(permissions.allowedActions?.includes(action));
  };

  const sanitizeUserAccountPermissions = (user: User): User => {
    if (user.role === 'SYSTEM_ADMIN') return user;
    const adminActions = [
      'USER_ACCOUNT_CREATE',
      'USER_ACCOUNT_EDIT',
      'USER_ACCOUNT_DELETE',
      'USER_SYSTEM_ADMIN_MANAGE',
    ];
    const permissions = user.permissions
      ? {
          ...user.permissions,
          allowedViews: (user.permissions.allowedViews || []).filter((v) => v !== 'users'),
          allowedActions: (user.permissions.allowedActions || []).filter(
            (a) => !adminActions.includes(a),
          ),
        }
      : undefined;
    return { ...user, permissions };
  };

  // GET Users
  router.get('/', async (req, res) => {
    try {
      const liveUsers = await loadLiveUsers();
      if (liveUsers) {
        const databaseUsers = (liveUsers as User[]).map(sanitizeUserAccountPermissions);
        setUsersState(databaseUsers);
        // User accounts are the source of truth for BLGF Personnel. Recreate
        // any missing profile by permanent user ID, including legacy accounts
        // that existed before automatic directory synchronization.
        // Keep the in-memory directory aligned without writing a full database
        // snapshot during a read-only GET request. Persisting here could
        // overwrite changes made directly in MySQL between polling cycles.
        databaseUsers.forEach((user) => syncEmployeeProfile(user, false));
      }
      const actingUser = getActingUser(req);
      if (!actingUser) return res.json([]);
      const visibleUsers =
        actingUser.role === 'SYSTEM_ADMIN'
          ? getUsersState()
          : getUsersState()
              .filter((user) => user.active)
              .map(sanitizeUserAccountPermissions);
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
          : getUsersState()
              .filter((user) => user.active)
              .map(sanitizeUserAccountPermissions);
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
      return res.status(403).json({ error: 'System Administrator access required to create user accounts.' });
    }
    if (body.role === 'SYSTEM_ADMIN' && !hasUserAction(actingUser, 'USER_SYSTEM_ADMIN_MANAGE')) {
      return res.status(403).json({
        error: 'Protected System Administrator account permission required.',
      });
    }
    if (
      body.permissions?.allowedActions?.includes('USER_SYSTEM_ADMIN_MANAGE') &&
      !hasUserAction(actingUser, 'USER_SYSTEM_ADMIN_MANAGE')
    ) {
      return res.status(403).json({
        error: 'You cannot grant protected System Administrator permissions.',
      });
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
    const newUser: User = sanitizeUserAccountPermissions({
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
    });

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
      return res.status(403).json({ error: 'System Administrator access required to modify user accounts.' });
    }
    const isSystemAdministrator = usersState[uIdx].role === 'SYSTEM_ADMIN';
    if (
      !isSelfUpdate &&
      isSystemAdministrator &&
      !hasUserAction(actingUser, 'USER_SYSTEM_ADMIN_MANAGE')
    ) {
      return res.status(403).json({
        error: 'Protected System Administrator account permission required.',
      });
    }
    if (
      req.body.role === 'SYSTEM_ADMIN' &&
      !hasUserAction(actingUser, 'USER_SYSTEM_ADMIN_MANAGE')
    ) {
      return res.status(403).json({
        error: 'Protected System Administrator role assignment permission required.',
      });
    }
    const requestedCurrentPassword = String(req.body.currentPassword || '');
    const updates = { ...req.body };
    delete updates.currentPassword;
    if (updates.permissions) {
      const currentlyCanManageSystemAdministrators = Boolean(
        usersState[uIdx].permissions?.allowedActions?.includes(
          'USER_SYSTEM_ADMIN_MANAGE',
        ),
      );
      const willManageSystemAdministrators = Boolean(
        updates.permissions.allowedActions?.includes(
          'USER_SYSTEM_ADMIN_MANAGE',
        ),
      );
      if (
        !currentlyCanManageSystemAdministrators &&
        willManageSystemAdministrators &&
        !hasUserAction(actingUser, 'USER_SYSTEM_ADMIN_MANAGE')
      ) {
        return res.status(403).json({
          error: 'You cannot grant protected System Administrator permissions.',
        });
      }
    }
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
    const passwordWillChange = Boolean(updates.password);
    if (updates.password) {
      const administratorResettingAnotherUser =
        !isSelfUpdate && actingUser.role === 'SYSTEM_ADMIN';
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
    const updatedUser = sanitizeUserAccountPermissions({
      ...usersState[uIdx],
      ...updates,
      username,
    });

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
      details: passwordWillChange
        ? `Updated account details and changed the database login password for ${updatedUser.fullName}`
        : `Updated account details for ${updatedUser.fullName}`,
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

    if (
      passwordWillChange &&
      updatedUser.email &&
      updatedUser.email.trim() &&
      updatedUser.email.trim() !== 'N/A' &&
      updatedUser.email.includes('@')
    ) {
      void sendPasswordUpdatedEmail(
        updatedUser,
        isSelfUpdate ? undefined : updates.password,
        !isSelfUpdate,
      ).catch((err) =>
        console.warn('[USERS] Password update email delivery warning:', err),
      );
    }

    res.json(withoutCredentials(updatedUser));
  });

  // POST /api/users/:id/reset-password
  router.post('/:id/reset-password', async (req, res) => {
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    if (actingUser.role !== 'SYSTEM_ADMIN') {
      return res.status(403).json({
        error: 'System Administrator access required to reset user passwords.',
      });
    }

    const usersState = getUsersState();
    const targetUser = usersState.find((u) => u.id === req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const recipientEmail = targetUser.email?.trim();
    if (
      !recipientEmail ||
      recipientEmail === 'N/A' ||
      !recipientEmail.includes('@')
    ) {
      return res.status(400).json({
        error: `User "${targetUser.fullName}" does not have an official email address on file. Please configure their email address first.`,
      });
    }

    // Generate secure temporary recovery password
    const temporaryPassword = `BLGF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const temporaryPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const emailResult = await sendTemporaryPasswordEmail(
      targetUser,
      temporaryPassword,
      15,
    );

    if (!emailResult.success) {
      return res.status(500).json({
        error: `Failed to dispatch temporary password email to ${recipientEmail}: ${emailResult.error || 'SMTP delivery failure'}.`,
      });
    }

    targetUser.password = temporaryPassword;
    targetUser.temporaryPasswordExpiresAt = temporaryPasswordExpiresAt.toISOString();

    try {
      await updateUserPassword(
        targetUser.id,
        temporaryPassword,
        temporaryPasswordExpiresAt,
      );
    } catch (err) {
      console.warn('[USERS] MySQL updateUserPassword error:', err);
    }

    const auditLog = addAuditLog(getAuditLogsState(), {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: 'UPDATE_USER',
      details: `Administrator ${actingUser.fullName} dispatched a temporary password reset email to ${targetUser.fullName} (${recipientEmail}).`,
      ipAddress: req.ip || '127.0.0.1',
    });

    try {
      await saveAuditLogDirect(auditLog);
    } catch (err) {
      console.warn('[USERS] Audit log direct save warning:', err);
    }

    return res.json({
      success: true,
      message: `A temporary password has been successfully sent to ${targetUser.fullName}'s email (${recipientEmail}).`,
      targetEmail: recipientEmail,
      username: targetUser.username,
    });
  });

  // DELETE User
  router.delete('/:id', async (req, res) => {
    const usersState = getUsersState();
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    if (actingUser.role !== 'SYSTEM_ADMIN') {
      return res.status(403).json({ error: 'System Administrator access required to delete user accounts.' });
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
