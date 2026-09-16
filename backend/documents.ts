import express from 'express';
import { findPreviousDelivery, hasCompletedPart, getPendingRecipients } from '../frontend/src/app/utils/routing-recipients.js';
import { isDocumentParticipant } from '../frontend/src/app/utils/document-visibility.js';
import { randomUUID } from 'node:crypto';
import {
  addAuditLog,
  createNotification,
  flushDatabaseSync,
  markLatestRouteAsProcessed,
  saveDatabaseToFile,
} from './serverUtils.js';
import {
  saveDocumentDirect,
  saveAuditLogDirect,
  loadLiveDocuments,
  deleteDocumentDirect,
} from './mysqlReplica.js';
import {
  DocumentRecord,
  DocumentRouteStep,
  DocumentStatus,
  NotificationItem,
  User,
  AuditLog,
  DEFAULT_ROLE_PERMISSIONS,
  DivisionCode,
} from '../frontend/src/app/types.js';

export function createDocumentsRouter(
  getUsersState: () => User[],
  getDocumentsState: () => DocumentRecord[],
  setDocumentsState: (documents: DocumentRecord[]) => void,
  getNotificationsState: () => NotificationItem[],
  getAuditLogsState: () => AuditLog[],
  setNotificationsState: (notifications: NotificationItem[]) => void,
) {
  const router = express.Router();
  const findActiveDatabaseUser = (id?: string) =>
    getUsersState().find(
      (user) => user.active && Boolean(id) && user.id === id,
    );
  const getActingUser = (req: express.Request) =>
    findActiveDatabaseUser(String(req.get('X-User-Id') || ''));
  const getNextRouteNumber = (direction: string) => {
    const now = new Date();
    const directionCode = direction === 'OUTGOING' ? 'OUT' : 'IN';
    const prefix = `BLGFR2-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${directionCode}-`;
    const highest = getDocumentsState().reduce((currentHighest, document) => {
      const numbers = [document.trackingNumber, document.routeNo];
      return numbers.reduce((value, number) => {
        if (!number?.startsWith(prefix)) return value;
        const sequence = Number(number.slice(prefix.length));
        return Number.isInteger(sequence) ? Math.max(value, sequence) : value;
      }, currentHighest);
    }, 0);
    return `${prefix}${String(highest + 1).padStart(2, '0')}`;
  };
  const canViewDocument = (user: User, document: DocumentRecord) => {
    const permissions =
      user.permissions ||
      DEFAULT_ROLE_PERMISSIONS[user.role] ||
      DEFAULT_ROLE_PERMISSIONS.STAFF;
    if (user.role === 'SYSTEM_ADMIN' || permissions.canViewAllDocuments) {
      return true;
    }
    return isDocumentParticipant(document, user, getAuditLogsState());
  };
  const getPendingDecisionRoute = (user: User, document: DocumentRecord) =>
    [...(document.routes || [])].reverse().find((assignedRoute) => {
      if (['APPROVED', 'DISAPPROVED'].includes(assignedRoute.actionRequested.toUpperCase())) return false;
      const assignedToUser = assignedRoute.toUserId === user.id ||
        (!assignedRoute.toUserId && assignedRoute.toUser?.trim().toLowerCase() === user.fullName.trim().toLowerCase());
      if (!assignedToUser) return false;
      const actedInRoutes = (document.routes || []).some((route) =>
        route.createdAt > assignedRoute.createdAt &&
        ['APPROVED', 'DISAPPROVED'].includes(route.actionRequested.toUpperCase()) &&
        (route.fromUserId === user.id ||
          (!route.fromUserId && route.fromUser?.trim().toLowerCase() === user.fullName.trim().toLowerCase())));
      const actedInAudit = getAuditLogsState().some((log) =>
        log.documentTrackingNumber === document.trackingNumber &&
        new Date(log.timestamp).getTime() > new Date(assignedRoute.createdAt).getTime() &&
        (log.userId === user.id || (!log.userId && log.userName.trim().toLowerCase() === user.fullName.trim().toLowerCase())) &&
        /(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i.test(log.details));
      return !actedInRoutes && !actedInAudit;
    });
  const withRecoveredAuditRoutes = (document: DocumentRecord) => {
    const storedRoutes = document.routes || [];
    const recovered = getAuditLogsState()
      .filter(
        (log) =>
          log.documentTrackingNumber === document.trackingNumber &&
          log.action === 'ROUTE_DOC',
      )
      .flatMap((log, index) => {
        const toName = log.details.match(/\bTo:\s*([^|]+)/i)?.[1]?.trim();
        if (!toName || /^N\/A(?:\s|$)/i.test(toName)) return [];
        const recipient = getUsersState().find(
          (user) =>
            user.active &&
            user.fullName.trim().toLowerCase() === toName.toLowerCase(),
        );
        const recipientDivision =
          recipient?.divisionCode ||
          log.details.match(/\b(?:To Division|Division):\s*([^|]+)/i)?.[1]?.trim() ||
          document.currentDivision;
        const recipientName = recipient?.fullName || toName;
        const recipientId = recipient?.id;
        const actionRequested =
          log.details.match(/Action:\s*(.*?)(?:\s*\|\s*Remarks:|$)/i)?.[1] ||
          'Appropriate Action';
        const duplicate = storedRoutes.some(
          (route) =>
            (route.fromUserId === log.userId ||
              route.fromUser.trim().toLowerCase() ===
                log.userName.trim().toLowerCase()) &&
            ((recipientId && route.toUserId === recipientId) ||
              route.toUser?.trim().toLowerCase() ===
                recipientName.trim().toLowerCase()) &&
            route.actionRequested.trim().toLowerCase() ===
              actionRequested.trim().toLowerCase() &&
            Math.abs(
              new Date(route.createdAt).getTime() -
                new Date(log.timestamp).getTime(),
            ) < 5000,
        );
        if (duplicate) return [];
        const sender = findActiveDatabaseUser(log.userId);
        const statusAfter =
          log.details.match(/Status:\s*([^|]+)$/i)?.[1]?.trim() ||
          document.currentStatus;
        return [{
          id: `route-recovered-${log.id}`,
          documentId: document.id,
          stepNumber: storedRoutes.length + index + 1,
          routeNo: document.routeNo || document.trackingNumber,
          fromDivision: sender?.divisionCode || document.currentDivision,
          fromUserId: log.userId,
          fromUser: log.userName,
          toDivision: recipientDivision as DivisionCode,
          toUserId: recipientId,
          toUser: recipientName,
          actionRequested,
          remarks:
            log.details.match(/Remarks:\s*(.*?)(?:\s*\|\s*Status:|$)/i)?.[1] ||
            '',
          statusBefore: document.currentStatus,
          statusAfter: statusAfter as DocumentStatus,
          receivedAt: log.timestamp,
          createdAt: log.timestamp,
        } satisfies DocumentRouteStep];
      });
    return recovered.length
      ? { ...document, routes: [...storedRoutes, ...recovered] }
      : document;
  };

  const hideSystemAdministratorFromTransactions = (document: DocumentRecord) => document;

  // GET Documents (with search & filters)
  router.get('/', async (req, res) => {
    try {
      const liveDocuments = await loadLiveDocuments();
      if (liveDocuments) setDocumentsState(liveDocuments as DocumentRecord[]);
    } catch (error) {
      console.error('[GET /api/documents] Live MySQL read failed:', error);
      return res
        .status(503)
        .json({ error: 'Documents are temporarily unavailable.' });
    }
    let list = [...getDocumentsState()];
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    list = list
      .filter((document) => canViewDocument(actingUser, document))
      .map(withRecoveredAuditRoutes)
      .map(hideSystemAdministratorFromTransactions);
    const { search, direction, status, division, priority } = req.query;

    if (direction) {
      list = list.filter((d) => d.direction === direction);
    }
    if (status) {
      list = list.filter((d) => d.currentStatus === status);
    }
    if (division) {
      list = list.filter((d) => d.currentDivision === division);
    }
    if (priority) {
      list = list.filter((d) => d.priority === priority);
    }
    if (search) {
      const q = (search as string).toLowerCase();
      list = list.filter(
        (d) =>
          d.routeNo?.toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q) ||
          d.subject.toLowerCase().includes(q) ||
          d.originatingOffice.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q),
      );
    }

    res.json(list);
  });

  router.get('/next-route-number', async (req, res) => {
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    try {
      const liveDocuments = await loadLiveDocuments();
      if (liveDocuments) setDocumentsState(liveDocuments as DocumentRecord[]);
    } catch (error) {
      console.error('[GET next route number] Live read failed:', error);
      return res.status(503).json({ error: 'Unable to determine the next Document Route No.' });
    }
    res.json({ routeNo: getNextRouteNumber(String(req.query.direction || 'INCOMING')) });
  });

  // GET Single Document
  router.get('/:id', (req, res) => {
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    const doc = getDocumentsState().find(
      (d) => d.id === req.params.id || d.routeNo === req.params.id,
    );
    if (!doc || !canViewDocument(actingUser, doc)) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(hideSystemAdministratorFromTransactions(withRecoveredAuditRoutes(doc)));
  });

  // POST Create Document
  router.post('/', async (req, res) => {
    const body = req.body;
    const now = new Date().toISOString();
    let documentsState = getDocumentsState();
    const usersState = getUsersState();
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    try {
      const liveDocuments = await loadLiveDocuments();
      if (liveDocuments) {
        documentsState = liveDocuments as DocumentRecord[];
        setDocumentsState(documentsState);
      }
    } catch (error) {
      console.error('[POST /api/documents] Live duplicate check failed:', error);
      return res.status(503).json({ error: 'Unable to verify the next Document Route No.' });
    }

    const trackingNumber = String(body.routeNo || '').trim();
    const nextRouteNumber = getNextRouteNumber(String(body.direction || 'INCOMING'));
    const isDuplicate = documentsState.some(
      (document) =>
        document.trackingNumber === trackingNumber || document.routeNo === trackingNumber,
    );
    if (!trackingNumber || isDuplicate || trackingNumber !== nextRouteNumber) {
      return res.status(409).json({
        error: isDuplicate
          ? `Duplicate Document Route No.: ${trackingNumber} is already assigned. Nothing was saved.`
          : `Document Route No. is no longer available. The next number is ${nextRouteNumber}. Nothing was saved.`,
        nextRouteNo: nextRouteNumber,
      });
    }

    const newDocumentId = `doc-${randomUUID()}`;
    const isMultiDivisionInitialRoute =
      body.routeAllDivisions || body.routeMultipleDivisions;
    const initialRecipients = usersState.filter(
      (user) =>
        user.active &&
        user.role !== 'SYSTEM_ADMIN' &&
        user.divisionCode !== 'ITMS' &&
        Array.isArray(body.initialRecipientIds) &&
        body.initialRecipientIds.includes(user.id),
    );
    const directlyAssignedUser = body.assignedUserId
      ? findActiveDatabaseUser(String(body.assignedUserId))
      : undefined;
    if (
      directlyAssignedUser?.role === 'SYSTEM_ADMIN' ||
      directlyAssignedUser?.divisionCode === 'ITMS'
    ) {
      return res.status(400).json({
        error: 'System administrators cannot be document recipients or handlers.',
      });
    }
    const newDoc: DocumentRecord = {
      id: newDocumentId,
      trackingNumber,
      routeNo: trackingNumber,
      direction: body.direction || 'INCOMING',
      title: body.title,
      subject: body.subject || '',
      category: body.category || 'General Correspondence',
      originatingOffice: body.originatingOffice || 'External Office',
      destinationOffice: body.destinationOffice || 'BLGF Region II',
      senderName: body.senderName || '',
      senderPosition: body.senderPosition || '',
      senderAddress: body.senderAddress || '',
      recipientName: body.recipientName || '',
      recipientPosition: body.recipientPosition || '',
      recipientOffice: body.recipientOffice || '',
      recipientAddress: body.recipientAddress || '',
      priority: body.priority || 'ROUTINE',
      currentStatus: body.currentStatus || 'PENDING',
      currentDivision: body.currentDivision || 'AD',
      assignedUser: directlyAssignedUser?.fullName || '',
      assignedUserId: directlyAssignedUser?.id,
      dateReceived: body.dateReceived || now,
      targetCompletionDate:
        body.targetCompletionDate ||
        new Date(Date.now() + 3 * 86400000).toISOString(),
      tags: body.tags || [],
      attachments: (body.attachments || []).map((file: any) => ({ ...file, attachmentScope: 'DOCUMENT', uploadedByUserId: actingUser.id })),
      actionRequested: body.initialAction || 'Appropriate Action',
      routes:
        initialRecipients.length > 0
          ? initialRecipients.map((recipient, index) => ({
              id: `route-${randomUUID()}`,
              documentId: newDocumentId,
              stepNumber: index + 1,
              routeNo: trackingNumber,
              fromDivision: body.currentDivision || 'AD',
              fromUserId: actingUser.id,
              fromUser: actingUser.fullName,
              toDivision: recipient.divisionCode,
              toUser: recipient.fullName,
              toUserId: recipient.id,
              actionRequested: body.initialAction || 'Initial Entry & Routing',
              remarks: body.remarks || 'N/A',
              statusBefore: 'PENDING' as DocumentStatus,
              statusAfter: (body.currentStatus || 'PENDING') as DocumentStatus,
              isMultiRoute: initialRecipients.length > 1,
              receivedAt: now,
              createdAt: now,
            }))
          : [
              {
                id: `route-${randomUUID()}`,
                documentId: newDocumentId,
                stepNumber: 1,
                routeNo: trackingNumber,
                fromDivision: body.currentDivision || 'AD',
                fromUserId: actingUser.id,
                fromUser: actingUser.fullName,
                toDivision: body.currentDivision || 'AD',
                toUser: directlyAssignedUser?.fullName,
                toUserId: directlyAssignedUser?.id,
                actionRequested:
                  body.initialAction || 'Initial Entry & Routing',
                remarks: body.remarks || 'N/A',
                statusBefore: 'PENDING',
                statusAfter: body.currentStatus || 'PENDING',
                receivedAt: now,
                createdAt: now,
              },
            ],
      createdBy: actingUser.fullName,
      createdByUserId: actingUser.id,
      createdAt: now,
      updatedAt: now,
    };

    setDocumentsState([newDoc, ...documentsState]);
    saveDatabaseToFile(false);

    const creationAuditLog = addAuditLog(
      getAuditLogsState(),
      {
        userId: actingUser.id,
        userName: actingUser.fullName,
        userRole: actingUser.role,
        action: 'CREATE_DOC',
        documentTrackingNumber: trackingNumber,
        details: [
          `Created by: ${actingUser.fullName}`,
          `Document: ${body.title || 'Untitled'} [${trackingNumber}]`,
          `Subject: ${body.subject || 'N/A'}`,
          `Sender: ${body.senderName || 'N/A'}`,
          `Position: ${body.senderPosition || 'N/A'}`,
          `Originating office: ${body.originatingOffice || 'N/A'}`,
          `Address: ${body.senderAddress || 'N/A'}`,
          `Action: ${body.initialAction || 'Appropriate Action'}`,
        ].join(' | '),
        ipAddress: req.ip || '127.0.0.1',
      },
      false,
    );

    const createdNotifications: NotificationItem[] = [];
    if (body.assignedUserId) {
      const assignedRecipient = usersState.find(
        (user) =>
          user.id === body.assignedUserId &&
          user.active &&
          user.role !== 'SYSTEM_ADMIN' &&
          user.divisionCode !== 'ITMS',
      );
      if (assignedRecipient) {
        createdNotifications.push(
          createNotification(
            {
              userId: assignedRecipient.id,
              title: 'New Document Routed to You',
              message: `Document ${trackingNumber} (${newDoc.title}) was assigned directly to you.`,
              documentId: newDoc.id,
              trackingNumber,
              type: 'ACTION_REQUIRED',
            },
          ),
        );
      }
    } else if (body.currentDivision) {
      const excludedRecipientIds = Array.isArray(body.excludedRecipientIds)
        ? body.excludedRecipientIds
        : [];
      usersState
        .filter(
          (user) =>
            user.active &&
            (isMultiDivisionInitialRoute
              ? Array.isArray(body.initialRecipientIds) &&
                body.initialRecipientIds.includes(user.id)
              : user.divisionCode === body.currentDivision) &&
            !excludedRecipientIds.includes(user.id),
        )
        .forEach((divisionUser) => {
          createdNotifications.push(
            createNotification(
              {
                userId: divisionUser.id,
                title: `New Document for ${isMultiDivisionInitialRoute ? 'Multiple Divisions' : body.currentDivision}`,
                message: `Document ${trackingNumber} (${newDoc.title}) was routed to ${isMultiDivisionInitialRoute ? 'multiple divisions' : 'your division'}.`,
                documentId: newDoc.id,
                trackingNumber,
                type: 'ACTION_REQUIRED',
              },
            ),
          );
        });
    }

    await Promise.all([
      saveDocumentDirect(newDoc),
      saveAuditLogDirect(creationAuditLog),
    ]);
    res.status(201).json(newDoc);
  });

  // POST Approve / Disapprove the latest route assigned to the acting user
  router.post('/:id/decision', async (req, res) => {
    const documentsState = getDocumentsState();
    const docIndex = documentsState.findIndex((document) => document.id === req.params.id);
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    if (docIndex === -1) return res.status(404).json({ error: 'Document not found.' });

    const doc = documentsState[docIndex];
    // Completed documents are final: no further routing or decisions.
    if (doc.currentStatus === 'COMPLETED' || hasCompletedPart(doc, actingUser)) {
      return res.status(409).json({ error: 'This transaction has ended. Completed documents cannot be routed or changed.' });
    }
    const decision = String(req.body.decision || '').toUpperCase();
    const remarks = String(req.body.remarks || '').trim();
    if (decision !== 'APPROVED' && decision !== 'DISAPPROVED') {
      return res.status(400).json({ error: 'Select Approved or Disapproved.' });
    }
    if (decision === 'DISAPPROVED' && !remarks) {
      return res.status(400).json({ error: 'A disapproval remark is required.' });
    }

    let assignedRoute = [...(doc.routes || [])]
      .reverse()
      .find(
        (route) =>
          !['APPROVED', 'DISAPPROVED'].includes(
            route.actionRequested.toUpperCase(),
          ) &&
          (route.toUserId === actingUser.id ||
            (!route.toUserId &&
              route.toUser?.trim().toLowerCase() ===
                actingUser.fullName.trim().toLowerCase())),
      );
    if (!assignedRoute) {
      const recoveredAudit = [...getAuditLogsState()]
        .filter(
          (log) =>
            log.documentTrackingNumber === doc.trackingNumber &&
            new RegExp(
              `\\bTo:\\s*${actingUser.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s*\\||$)`,
              'i',
            ).test(log.details),
        )
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )[0];
      if (recoveredAudit) {
        const recoveredSender = findActiveDatabaseUser(recoveredAudit.userId);
        assignedRoute = {
          id: `route-recovered-${recoveredAudit.id}`,
          documentId: doc.id,
          stepNumber: (doc.routes || []).length + 1,
          routeNo: doc.routeNo || doc.trackingNumber,
          fromDivision: recoveredSender?.divisionCode || doc.currentDivision,
          fromUserId: recoveredSender?.id,
          fromUser: recoveredAudit.userName,
          toDivision: actingUser.divisionCode,
          toUserId: actingUser.id,
          toUser: actingUser.fullName,
          actionRequested:
            recoveredAudit.details.match(/Action:\s*(.*?)(?:\s*\|\s*Remarks:|$)/i)?.[1] ||
            'Appropriate Action',
          remarks:
            recoveredAudit.details.match(/Remarks:\s*(.*?)(?:\s*\|\s*Status:|$)/i)?.[1] ||
            '',
          statusBefore: doc.currentStatus,
          statusAfter: doc.currentStatus,
          createdAt: recoveredAudit.timestamp,
        };
        doc.routes.push(assignedRoute);
      }
    }
    if (!assignedRoute) {
      return res.status(403).json({ error: 'This document is not awaiting your decision.' });
    }
    const latestDecision = [...(doc.routes || [])]
      .reverse()
      .find(
        (route) =>
          (route.fromUserId === actingUser.id ||
            (!route.fromUserId &&
              route.fromUser?.trim().toLowerCase() ===
                actingUser.fullName.trim().toLowerCase())) &&
          route.createdAt > assignedRoute.createdAt &&
          ['APPROVED', 'DISAPPROVED'].includes(route.actionRequested),
      );
    const isReapproval =
      decision === 'APPROVED' && latestDecision?.actionRequested === 'DISAPPROVED';
    if (latestDecision && !isReapproval) {
      return res.status(409).json({ error: 'You have already acted on this document route.' });
    }

    const now = new Date().toISOString();
    assignedRoute.actionTaken = decision;
    assignedRoute.processedAt = now;
    const legacySenderRoute = (doc.routes || []).find(
      (route) =>
        Boolean(route.toUserId) &&
        route.toUser?.trim().toLowerCase() ===
          assignedRoute.fromUser?.trim().toLowerCase(),
    );
    const sender =
      (assignedRoute.fromUserId
        ? findActiveDatabaseUser(assignedRoute.fromUserId)
        : undefined) ||
      (legacySenderRoute?.toUserId
        ? findActiveDatabaseUser(legacySenderRoute.toUserId)
        : undefined) ||
      (doc.createdByUserId
        ? findActiveDatabaseUser(doc.createdByUserId)
        : undefined) ||
      getUsersState().find(
        (user) =>
          user.active &&
          (user.fullName.trim().toLowerCase() ===
            assignedRoute.fromUser?.trim().toLowerCase() ||
            user.fullName.trim().toLowerCase() ===
              doc.createdBy?.trim().toLowerCase()),
      );
    const decisionRoute: DocumentRouteStep = {
      id: `route-decision-${randomUUID()}`,
      documentId: doc.id,
      stepNumber: (doc.routes || []).length + 1,
      routeNo: doc.routeNo || doc.trackingNumber,
      fromDivision: actingUser.divisionCode,
      fromUserId: actingUser.id,
      fromUser: actingUser.fullName,
      toDivision: decision === 'DISAPPROVED' && sender
        ? sender.divisionCode
        : actingUser.divisionCode,
      toUser: sender?.fullName,
      toUserId: sender?.id,
      actionRequested: decision,
      remarks: remarks || 'Approved; proceed with routing.',
      statusBefore: doc.currentStatus,
      statusAfter: decision === 'DISAPPROVED' ? 'RETURNED' : 'IN_PROGRESS',
      receivedAt: now,
      createdAt: now,
    };
    doc.routes.push(decisionRoute);
    doc.currentStatus = decisionRoute.statusAfter;
    doc.updatedAt = now;
    if (decision === 'DISAPPROVED' && sender) {
      doc.currentDivision = sender.divisionCode;
      doc.assignedUser = sender.fullName;
      doc.assignedUserId = sender.id;
    }
    documentsState[docIndex] = doc;
    setDocumentsState(documentsState);
    saveDatabaseToFile(false);

    const auditLog = addAuditLog(getAuditLogsState(), {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: 'UPDATE_STATUS',
      documentTrackingNumber: doc.trackingNumber,
      details: `${decision} by ${actingUser.fullName} | Remarks: ${remarks || 'Approved; proceed with routing.'}`,
      ipAddress: req.ip || '127.0.0.1',
    }, false);
    await Promise.all([saveDocumentDirect(doc), saveAuditLogDirect(auditLog)]);
    res.json(withRecoveredAuditRoutes(doc));
  });

  // POST Route/Forward Document
  router.post('/:id/route', async (req, res) => {
    const documentsState = getDocumentsState();
    const docIndex = documentsState.findIndex((d) => d.id === req.params.id);
    if (docIndex === -1) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = documentsState[docIndex];
    const {
      fromDivision,
      toDivision,
      toUser,
      toUserId,
      actionRequested,
      remarks,
      replyAttachments,
      newStatus,
      actingUserId,
      actingUserName,
      routeNo,
    } = req.body;
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    if (!canViewDocument(actingUser, doc)) {
      return res.status(404).json({ error: 'Document not found' });
    }
    // Completed documents are final: no further routing or decisions.
    if (doc.currentStatus === 'COMPLETED' || hasCompletedPart(doc, actingUser)) {
      return res.status(409).json({ error: 'This transaction has ended. Completed documents cannot be routed or changed.' });
    }
    if (doc.currentStatus === 'RETURNED') {
      return res.status(409).json({
        error: 'This document is disapproved. Re-approve it before routing.',
      });
    }
    if (getPendingDecisionRoute(actingUser, doc)) {
      return res.status(409).json({
        error: 'Action required: Approve or Disapprove this document before routing or forwarding it.',
      });
    }

    if (
      routeNo &&
      documentsState.some(
        (document) =>
          document.id !== doc.id &&
          (document.routeNo?.trim().toLowerCase() ===
            String(routeNo).trim().toLowerCase() ||
            document.routes?.some(
              (route) =>
                route.routeNo?.trim().toLowerCase() ===
                String(routeNo).trim().toLowerCase(),
            )),
      )
    ) {
      return res.status(409).json({
        error: `Document Route No. ${routeNo} is already used by another document.`,
      });
    }

    const recipient = getUsersState().find(
      (user) =>
        user.id === toUserId &&
        user.active &&
        user.role !== 'SYSTEM_ADMIN' &&
        user.divisionCode !== 'ITMS',
    );
    const isCompletionWithoutRecipient =
      newStatus === 'COMPLETED' && !toUserId && !toUser;
    if (!recipient && !isCompletionWithoutRecipient) {
      return res
        .status(400)
        .json({ error: 'Select an active user account as the recipient.' });
    }
    if (recipient && findPreviousDelivery(doc, recipient)) {
      return res.status(409).json({ error: `Already routed to ${recipient.fullName}. Choose another recipient.` });
    }

    const now = new Date().toISOString();
    const oldStatus = doc.currentStatus;
    if (newStatus === 'COMPLETED' && (toUserId || toUser)) {
      return res.status(400).json({ error: 'Complete your part without sending to new recipients.' });
    }
    const nextStatus: DocumentStatus = newStatus || doc.currentStatus;

    const stepNumber = (doc.routes || []).length + 1;
    markLatestRouteAsProcessed(
      doc,
      actingUser.id,
      actingUser.fullName,
      actionRequested || 'Document forwarded',
      now,
      Array.isArray(replyAttachments) ? replyAttachments : undefined,
    );
    const newRoute: DocumentRouteStep = {
      id: `route-${randomUUID()}`,
      documentId: doc.id,
      stepNumber,
      routeNo: routeNo || doc.routeNo || '',
      fromDivision: fromDivision || doc.currentDivision,
      fromUserId: actingUser.id,
      fromUser: actingUser.fullName,
      toDivision: toDivision || doc.currentDivision,
      toUser: recipient?.fullName,
      toUserId: recipient?.id,
      actionRequested: actionRequested || 'For Appropriate Action',
      remarks: remarks || '',
      statusBefore: oldStatus,
      statusAfter: nextStatus,
      receivedAt: now,
      attachments: Array.isArray(replyAttachments)
        ? replyAttachments.map((file: any) => ({ ...file, attachmentScope: 'RECIPIENT', uploadedByUserId: actingUser.id }))
        : undefined,
      createdAt: now,
    };

    doc.routes.push(newRoute);
    if (routeNo) doc.routeNo = routeNo;
    doc.currentDivision = toDivision || doc.currentDivision;
    const pendingRecipients = nextStatus === 'COMPLETED' ? getPendingRecipients(doc) : [];
    doc.currentStatus = nextStatus === 'COMPLETED' && pendingRecipients.length ? 'IN_PROGRESS' : nextStatus;
    doc.actionRequested = actionRequested || doc.actionRequested;
    if (recipient) {
      doc.assignedUser = recipient.fullName;
      doc.assignedUserId = recipient.id;
    } else {
      doc.assignedUser = pendingRecipients[0]?.toUser;
      doc.assignedUserId = pendingRecipients[0]?.toUserId;
    }
    doc.updatedAt = now;
    setNotificationsState(
      getNotificationsState().filter(
        (notification) =>
          !(
            notification.documentId === doc.id &&
            notification.userId === actingUser.id
          ),
      ),
    );

    if (doc.currentStatus === 'COMPLETED' && !doc.completedDate) {
      doc.completedDate = now;
      doc.destinationOffice = 'BLGF Regional Office II';
    }

    documentsState[docIndex] = doc;
    setDocumentsState(documentsState);
    saveDatabaseToFile(false);

    const auditLog = addAuditLog(getAuditLogsState(), {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: 'ROUTE_DOC',
      documentTrackingNumber: doc.trackingNumber,
      details: [
        `Routed by: ${actingUser.fullName}`,
        `Document: ${doc.title} [${doc.trackingNumber}]`,
        `Subject: ${doc.subject || 'N/A'}`,
        `From: ${fromDivision || doc.currentDivision}`,
        `To: ${recipient?.fullName || toUser || 'N/A'}`,
        `Action: ${actionRequested || 'For Appropriate Action'}`,
        `Remarks: ${remarks || 'N/A'}`,
        `Status: ${nextStatus}`,
      ].join(' | '),
      ipAddress: req.ip || '127.0.0.1',
    }, false);

    // Persist before responding. Otherwise the immediate frontend refresh can
    // reload the previous MySQL copy and make the newly created route vanish.
    await Promise.all([saveDocumentDirect(doc), saveAuditLogDirect(auditLog)]);

    // Notify assigned recipient user
    if (recipient) {
      createNotification({
        userId: recipient.id,
        title: 'Document Routed to You',
        message: `Document ${doc.trackingNumber} (${doc.title}) forwarded for: ${actionRequested}`,
        documentId: doc.id,
        trackingNumber: doc.trackingNumber,
        type: nextStatus === 'FOR_SIGNATURE' ? 'ACTION_REQUIRED' : 'INFO',
      });
    }

    res.json(doc);
  });

  // POST Transfer / Reassign Document (When document was misrouted or not theirs)
  router.post('/:id/transfer', (req, res) => {
    const documentsState = getDocumentsState();
    const docIndex = documentsState.findIndex((d) => d.id === req.params.id);
    if (docIndex === -1) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = documentsState[docIndex];
    const {
      fromDivision,
      toDivision,
      toUser,
      toUserId,
      transferReason,
      actingUserId,
      actingUserName,
      routeNo,
    } = req.body;
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    if (!canViewDocument(actingUser, doc)) {
      return res.status(404).json({ error: 'Document not found' });
    }
    // Completed documents are final: no further routing or decisions.
    if (doc.currentStatus === 'COMPLETED' || hasCompletedPart(doc, actingUser)) {
      return res.status(409).json({ error: 'This transaction has ended. Completed documents cannot be routed or changed.' });
    }
    const recipient = findActiveDatabaseUser(toUserId);
    if (
      recipient?.role === 'SYSTEM_ADMIN' ||
      recipient?.divisionCode === 'ITMS'
    ) {
      return res.status(400).json({
        error: 'System administrators cannot be document recipients or handlers.',
      });
    }
    if (!recipient) {
      return res.status(400).json({ error: 'Select an active database user.' });
    }

    if (
      routeNo &&
      documentsState.some(
        (document) =>
          document.id !== doc.id &&
          (document.routeNo?.trim().toLowerCase() ===
            String(routeNo).trim().toLowerCase() ||
            document.routes?.some(
              (route) =>
                route.routeNo?.trim().toLowerCase() ===
                String(routeNo).trim().toLowerCase(),
            )),
      )
    ) {
      return res.status(409).json({
        error: `Document Route No. ${routeNo} is already used by another document.`,
      });
    }

    if (findPreviousDelivery(doc, recipient)) {
      return res.status(409).json({ error: 'Already routed to this recipient. Choose another recipient.' });
    }

    const now = new Date().toISOString();
    const oldStatus = doc.currentStatus;
    const stepNumber = (doc.routes || []).length + 1;
    markLatestRouteAsProcessed(
      doc,
      actingUser.id,
      actingUser.fullName,
      'Document transferred',
      now,
    );

    const transferRoute: DocumentRouteStep = {
      id: `route-${randomUUID()}`,
      documentId: doc.id,
      stepNumber,
      fromDivision: fromDivision || doc.currentDivision,
      fromUserId: actingUser.id,
      fromUser: actingUser.fullName,
      toDivision: toDivision,
      toUser: recipient.fullName,
      toUserId: recipient.id,
      actionRequested: 'Transfer / Reassigned to Correct Office',
      remarks: transferReason
        ? `[DOCUMENT TRANSFER] ${transferReason}`
        : '[DOCUMENT TRANSFER] Transferred to correct office',
      statusBefore: oldStatus,
      statusAfter: oldStatus,
      isTransfer: true,
      receivedAt: now,
      createdAt: now,
    };

    doc.routes.push(transferRoute);
    doc.currentDivision = toDivision;
    doc.assignedUser = recipient.fullName;
    doc.assignedUserId = recipient.id;
    doc.updatedAt = now;

    documentsState[docIndex] = doc;
    setDocumentsState(documentsState);
    saveDatabaseToFile();

    addAuditLog(getAuditLogsState(), {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: 'TRANSFER_DOC',
      documentTrackingNumber: doc.trackingNumber,
      details: `Transferred document [${doc.trackingNumber}] from ${fromDivision} to ${toDivision}. Reason: ${transferReason}`,
      ipAddress: req.ip || '127.0.0.1',
    });

    createNotification({
      userId: recipient.id,
      title: `Document Transferred to ${toDivision}`,
      message: `Document ${doc.trackingNumber} transferred by ${actingUser.fullName}: ${transferReason}`,
      documentId: doc.id,
      trackingNumber: doc.trackingNumber,
      type: 'INFO',
    });

    res.json(doc);
  });

  // POST Multi-Route Document (Dispatch to multiple divisions at once)
  router.post('/:id/multi-route', async (req, res) => {
    const documentsState = getDocumentsState();
    const docIndex = documentsState.findIndex((d) => d.id === req.params.id);
    if (docIndex === -1) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = documentsState[docIndex];
    if (doc.currentStatus === 'RETURNED') {
      return res.status(409).json({
        error: 'This document is disapproved. Re-approve it before routing.',
      });
    }
    const {
      fromDivision,
      targetDivisions, // Array of DivisionCodes, e.g. ['LTOD', 'LAOD', 'AD']
      recipients,
      actionRequested,
      remarks,
      replyAttachments,
      newStatus,
      actingUserId,
      actingUserName,
      routeNo,
    } = req.body;
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    if (!canViewDocument(actingUser, doc)) {
      return res.status(404).json({ error: 'Document not found' });
    }
    // Completed documents are final: no further routing or decisions.
    if (doc.currentStatus === 'COMPLETED' || hasCompletedPart(doc, actingUser)) {
      return res.status(409).json({ error: 'This transaction has ended. Completed documents cannot be routed or changed.' });
    }
    if (getPendingDecisionRoute(actingUser, doc)) {
      return res.status(409).json({
        error: 'Action required: Approve or Disapprove this document before routing or forwarding it.',
      });
    }

    if (
      routeNo &&
      documentsState.some(
        (document) =>
          document.id !== doc.id &&
          (document.routeNo?.trim().toLowerCase() ===
            String(routeNo).trim().toLowerCase() ||
            document.routes?.some(
              (route) =>
                route.routeNo?.trim().toLowerCase() ===
                String(routeNo).trim().toLowerCase(),
            )),
      )
    ) {
      return res.status(409).json({
        error: `Document Route No. ${routeNo} is already used by another document.`,
      });
    }

    const requestedRoutingTargets =
      Array.isArray(recipients) && recipients.length > 0
        ? recipients
        : Array.isArray(targetDivisions)
          ? targetDivisions.map((division: string) => ({
              toDivision: division,
            }))
          : [];
    const routingTargets = requestedRoutingTargets.filter((target: any) => {
      if (target.toDivision === 'ITMS') return false;
      if (!target.toUserId) return true;
      return getUsersState().some(
        (user) =>
          user.id === target.toUserId &&
          user.active &&
          user.role !== 'SYSTEM_ADMIN' &&
          user.divisionCode !== 'ITMS',
      );
    });

    if (routingTargets.length === 0) {
      return res
        .status(400)
        .json({ error: 'At least one target division must be specified' });
    }

    // Reject the whole request before changing routes or sending notifications.
    const targetKeys = new Set<string>();
    for (const target of routingTargets) {
      const recipient = findActiveDatabaseUser(target.toUserId);
      const key = target.toUserId || `${target.toDivision}:${String(target.toUser || '').trim().toLowerCase()}`;
      if (targetKeys.has(key)) return res.status(409).json({ error: 'The same recipient is listed more than once. Review your recipients.' });
      targetKeys.add(key);
      if (findPreviousDelivery(doc, recipient || { fullName: target.toUser, divisionCode: target.toDivision })) {
        return res.status(409).json({ error: `Already routed to ${recipient?.fullName || target.toUser}. Choose another recipient.` });
      }
    }

    const now = new Date().toISOString();
    const oldStatus = doc.currentStatus;
    if (newStatus === 'COMPLETED') {
      return res.status(400).json({ error: 'Complete your part without sending to new recipients.' });
    }
    const nextStatus: DocumentStatus = newStatus || doc.currentStatus;

    markLatestRouteAsProcessed(
      doc,
      actingUser.id,
      actingUser.fullName,
      actionRequested || 'Document multi-routed',
      now,
      Array.isArray(replyAttachments) ? replyAttachments : undefined,
    );
    routingTargets.forEach((target: any, index: number) => {
      const targetDiv = target.toDivision;
      const stepNumber = (doc.routes || []).length + 1;
      const multiRouteStep: DocumentRouteStep = {
        id: `route-${randomUUID()}`,
        documentId: doc.id,
        stepNumber,
        routeNo: routeNo || doc.routeNo || '',
        fromDivision: fromDivision || doc.currentDivision,
        fromUserId: actingUser.id,
        fromUser: actingUser.fullName,
        toDivision: targetDiv,
        toUser: target.toUser,
        toUserId: target.toUserId,
        actionRequested:
          actionRequested || 'For Information & Appropriate Action',
        remarks: remarks
          ? `[MULTI-ROUTE ${index + 1}/${routingTargets.length}] ${remarks}`
          : `[MULTI-ROUTE ${index + 1}/${routingTargets.length}] Routed simultaneously`,
        statusBefore: oldStatus,
        statusAfter: nextStatus,
        isMultiRoute: true,
        receivedAt: now,
        attachments: Array.isArray(replyAttachments)
          ? replyAttachments.map((file: any) => ({ ...file, attachmentScope: 'RECIPIENT', uploadedByUserId: actingUser.id }))
          : undefined,
        createdAt: now,
      };
      doc.routes.push(multiRouteStep);

      const targetUser = findActiveDatabaseUser(target.toUserId);
      if (targetUser) {
        createNotification({
          userId: targetUser.id,
          title: `Multi-Route Received at ${targetDiv}`,
          message: `Document ${doc.trackingNumber} dispatched to multiple divisions including ${targetDiv}`,
          documentId: doc.id,
          trackingNumber: doc.trackingNumber,
          type: 'INFO',
        });
      }
    });

    if (routeNo) doc.routeNo = routeNo;

    // Set primary current division to the first target division in the multi-route
    doc.currentDivision = routingTargets[0].toDivision;
    doc.currentStatus = nextStatus;
    doc.actionRequested = actionRequested || doc.actionRequested;
    doc.updatedAt = now;
    setNotificationsState(
      getNotificationsState().filter(
        (notification) =>
          !(
            notification.documentId === doc.id &&
            notification.userId === actingUser.id
          ),
      ),
    );

    documentsState[docIndex] = doc;
    setDocumentsState(documentsState);
    saveDatabaseToFile(false);

    const auditLog = addAuditLog(getAuditLogsState(), {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: 'ROUTE_DOC',
      documentTrackingNumber: doc.trackingNumber,
      details: `Multi-routed [${doc.trackingNumber}] to ${routingTargets
        .map((target: any) => target.toUser || target.toDivision)
        .join(', ')}. Action: ${actionRequested}`,
      ipAddress: req.ip || '127.0.0.1',
    }, false);

    await Promise.all([saveDocumentDirect(doc), saveAuditLogDirect(auditLog)]);

    res.json(doc);
  });

  // POST Attach File to Existing Document
  router.post('/:id/attachments', async (req, res) => {
    const documentsState = getDocumentsState();
    const docIndex = documentsState.findIndex((d) => d.id === req.params.id);
    if (docIndex === -1) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = documentsState[docIndex];
    const {
      fileName,
      fileSize,
      fileType,
      url,
      fileData,
      actingUserId,
      actingUserName,
    } = req.body;
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    if (!canViewDocument(actingUser, doc)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const newAttachment = {
      id: `att-${randomUUID()}`,
      attachmentScope: 'RECIPIENT' as const,
      uploadedByUserId: actingUser.id,
      uploadedForRouteId: [...(doc.routes || [])].reverse().find(route => route.toUserId === actingUser.id && !['APPROVED', 'DISAPPROVED'].includes(route.actionRequested?.toUpperCase()))?.id,
      fileName: fileName || 'Document_Attachment.pdf',
      fileSize: fileSize || '1.2 MB',
      fileType: fileType || 'application/pdf',
      uploadDate: new Date().toISOString(),
      url: url || '',
      fileData: fileData || undefined,
    };

    if (!doc.attachments) doc.attachments = [];
    doc.attachments.push(newAttachment);
    doc.updatedAt = new Date().toISOString();

    documentsState[docIndex] = doc;
    setDocumentsState(documentsState);
    saveDatabaseToFile();

    addAuditLog(
      getAuditLogsState(),
      {
        userId: actingUser.id,
        userName: actingUser.fullName,
        userRole: actingUser.role,
        action: 'UPLOAD_ATTACHMENT',
        documentTrackingNumber: doc.trackingNumber,
        details: `Uploaded file attachment "${newAttachment.fileName}" (${newAttachment.fileSize}) to ${doc.trackingNumber}`,
        ipAddress: req.ip || '127.0.0.1',
      },
      false,
    );

    await flushDatabaseSync();
    res.json(doc);
  });

  // PATCH Update Final Handoff Instructions for completed document
  router.patch('/:id/final-instructions', async (req, res) => {
    const documentsState = getDocumentsState();
    const docIndex = documentsState.findIndex((d) => d.id === req.params.id);
    if (docIndex === -1) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = documentsState[docIndex];
    const actingUser =
      getActingUser(req) ||
      (req.body.actingUserId
        ? findActiveDatabaseUser(String(req.body.actingUserId))
        : undefined);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }

    const instructions = String(req.body.instructions || '').trim();
    if (!instructions) {
      return res.status(400).json({ error: 'Instruction cannot be empty.' });
    }

    // Update the targeted route if routeId specified, or final completed route, or latest route, or synthesize completion route
    const routes = doc.routes ? [...doc.routes] : [];
    const routeId = req.body.routeId ? String(req.body.routeId) : undefined;

    if (routeId) {
      const targetIndex = routes.findIndex((r) => r.id === routeId);
      if (targetIndex !== -1) {
        routes[targetIndex] = {
          ...routes[targetIndex],
          remarks: `Handoff Instructions: ${instructions}`,
        };
        doc.routes = routes;
      }
    } else {
      const finalRouteIndex = [...routes].reverse().findIndex((r) => r.statusAfter === 'COMPLETED');

      if (finalRouteIndex !== -1) {
        const actualIndex = routes.length - 1 - finalRouteIndex;
        routes[actualIndex] = {
          ...routes[actualIndex],
          remarks: `Handoff Instructions: ${instructions}`,
        };
        doc.routes = routes;
      } else if (routes.length > 0) {
        routes[routes.length - 1] = {
          ...routes[routes.length - 1],
          remarks: `Handoff Instructions: ${instructions}`,
        };
        doc.routes = routes;
      } else {
        routes.push({
          id: `route-${randomUUID()}`,
          documentId: doc.id,
          stepNumber: 1,
          routeNo: doc.routeNo || doc.trackingNumber,
          fromDivision: actingUser.divisionCode,
          fromUserId: actingUser.id,
          fromUser: actingUser.fullName,
          toDivision: doc.currentDivision || actingUser.divisionCode,
          actionRequested: 'Completed & Finalized',
          remarks: `Handoff Instructions: ${instructions}`,
          statusBefore: 'COMPLETED',
          statusAfter: 'COMPLETED',
          createdAt: new Date().toISOString(),
        });
        doc.routes = routes;
      }
    }

    doc.finalInstructions = instructions;
    doc.updatedAt = new Date().toISOString();

    documentsState[docIndex] = doc;
    setDocumentsState(documentsState);
    saveDatabaseToFile(false);

    const auditLog = addAuditLog(getAuditLogsState(), {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: 'UPDATE_STATUS',
      documentTrackingNumber: doc.trackingNumber,
      details: `Updated final instructions for ${doc.trackingNumber}: "${instructions}"`,
      ipAddress: req.ip || '127.0.0.1',
    }, false);

    await Promise.all([saveDocumentDirect(doc), saveAuditLogDirect(auditLog)]);
    res.json({ success: true, document: doc, instructions });
  });

  // PUT Update Document Status / Details
  router.put('/:id', async (req, res) => {
    const documentsState = getDocumentsState();
    const docIndex = documentsState.findIndex((d) => d.id === req.params.id);
    if (docIndex === -1) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const currentDoc = documentsState[docIndex];
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    if (!canViewDocument(actingUser, currentDoc)) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (currentDoc.currentStatus === 'COMPLETED' &&
        req.body.currentStatus !== undefined && req.body.currentStatus !== 'COMPLETED') {
      return res.status(409).json({ error: 'This transaction has ended and cannot be reopened for routing.' });
    }
    const updated = {
      ...currentDoc,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    documentsState[docIndex] = updated;
    setDocumentsState(documentsState);
    saveDatabaseToFile();

    addAuditLog(getAuditLogsState(), {
      userId: actingUser.id,
      userName: actingUser.fullName,
      userRole: actingUser.role,
      action: 'UPDATE_STATUS',
      documentTrackingNumber: currentDoc.trackingNumber,
      details: `Updated document details for ${currentDoc.trackingNumber}. Status: ${updated.currentStatus}`,
      ipAddress: req.ip || '127.0.0.1',
    });

    await flushDatabaseSync();
    res.json(updated);
  });

  // DELETE Document
  router.delete('/:id', async (req, res) => {
    const documentsState = getDocumentsState();
    const doc = documentsState.find((d) => d.id === req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const actingUser = getActingUser(req);
    if (!actingUser) {
      return res.status(401).json({ error: 'Active database user required.' });
    }
    const permissions =
      actingUser.permissions || DEFAULT_ROLE_PERMISSIONS[actingUser.role];
    if (actingUser.role !== 'SYSTEM_ADMIN' && !permissions.canDelete) {
      return res.status(403).json({ error: 'Delete permission is required.' });
    }

    setDocumentsState(documentsState.filter((d) => d.id !== req.params.id));
    saveDatabaseToFile(false);

    const deletionAuditLog = addAuditLog(
      getAuditLogsState(),
      {
        userId: actingUser.id,
        userName: actingUser.fullName,
        userRole: actingUser.role,
        action: 'DELETE_DOC',
        documentTrackingNumber: doc.trackingNumber,
        details: `Deleted document ${doc.trackingNumber} (${doc.title})`,
        ipAddress: req.ip || '127.0.0.1',
      },
      false,
    );

    try {
      await Promise.all([
        deleteDocumentDirect(doc.id),
        saveAuditLogDirect(deletionAuditLog),
      ]);
    } catch (error) {
      // Rollback deletion from memory if DB operation fails
      setDocumentsState(documentsState);
      return res
        .status(500)
        .json({ error: 'Failed to delete the document from the database.' });
    }

    res.json({
      success: true,
      message: `Document ${doc.trackingNumber} deleted`,
    });
  });

  return router;
}
