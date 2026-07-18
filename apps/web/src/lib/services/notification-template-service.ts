import type { Prisma } from '@mantemap/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChannelMessages {
  email: { subject: string; html: string };
  slack: { blocks: unknown[] };
  teams: unknown;
  telegram: { text: string };
}

interface AlertLike {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  message: string | null;
  metadata: Prisma.JsonValue | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAppUrl(): string {
  return process.env.APP_URL || 'http://localhost:3000';
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
      return 'FF0000';
    case 'WARNING':
      return 'FFA500';
    case 'INFO':
    default:
      return '0000FF';
  }
}

function buildAppLink(projectName: string): string {
  const appUrl = getAppUrl();
  return `<a href="${appUrl}">Open ${escapeHtml(projectName)} in ManteMap</a>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Email helpers
// ---------------------------------------------------------------------------

function emailHtml(title: string, lines: string[], appLink: string): string {
  const lineItems = lines.map(l => `<li>${l}</li>`).join('');
  return `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>${escapeHtml(title)}</h2>
        <p>The following alert requires your attention:</p>
        <ul>${lineItems}</ul>
        <p style="margin-top: 20px;">${appLink}</p>
        <hr />
        <p style="color: #888; font-size: 12px;">ManteMap — Asset & Document Management</p>
      </body>
    </html>
  `;
}

function emailSubject(prefix: string, detail: string): string {
  return `[ManteMap] ${prefix}: ${detail}`;
}

// ---------------------------------------------------------------------------
// Slack helpers (Block Kit)
// ---------------------------------------------------------------------------

function slackHeader(text: string) {
  return { type: 'header', text: { type: 'plain_text', text, emoji: true } };
}

function slackSection(text: string) {
  return { type: 'section', text: { type: 'mrkdwn', text } };
}

function slackDivider() {
  return { type: 'divider' };
}

function slackButton(text: string, url: string) {
  return {
    type: 'actions',
    elements: [{ type: 'button', text: { type: 'plain_text', text }, url }],
  };
}

// ---------------------------------------------------------------------------
// Teams helpers (MessageCard)
// ---------------------------------------------------------------------------

function teamsCard(
  title: string,
  sections: Array<{ fact: string; value: string }>,
  severity: string,
  appUrl: string,
) {
  return {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    themeColor: severityColor(severity),
    summary: title,
    title,
    sections: [
      {
        facts: sections.map(s => ({ name: s.fact, value: s.value })),
      },
      {
        activityTitle: 'Open in ManteMap',
        activitySubtitle: appUrl,
        potentialAction: [
          {
            '@type': 'OpenUri',
            name: 'View',
            targets: [{ os: 'default', uri: appUrl }],
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Telegram helpers (MarkdownV2-like plain Markdown)
// ---------------------------------------------------------------------------

function telegramText(title: string, lines: string[]): string {
  return [`*${title}*`, '', ...lines].join('\n');
}

// ---------------------------------------------------------------------------
// Formatters per AlertType
// ---------------------------------------------------------------------------

export function formatDocumentExpiring(
  alert: AlertLike,
  projectName: string,
  appUrl: string,
): ChannelMessages {
  const meta = (alert.metadata as Record<string, unknown>) || {};
  const docName = String(meta.documentName ?? 'Unknown document');
  const days = Number(meta.daysUntilExpiry ?? '?');

  // Email
  const subject = emailSubject('Document Expiring', docName);
  const htmlLines = [
    `Document: ${escapeHtml(docName)}`,
    `Project: ${escapeHtml(projectName)}`,
    `Expires in: ${days} day(s)`,
  ];
  const html = emailHtml(
    `Document Expiring: ${escapeHtml(docName)}`,
    htmlLines,
    buildAppLink(projectName),
  );

  // Slack
  const slackBlocks = [
    slackHeader(`📄 Document Expiring: ${docName}`),
    slackSection(`*Document:* ${docName}\n*Project:* ${projectName}\n*Expires in:* ${days} day(s)`),
    slackDivider(),
    slackButton('Open ManteMap', appUrl),
  ];

  // Teams
  const teamsMessage = teamsCard(
    `Document Expiring: ${docName}`,
    [
      { fact: 'Document', value: docName },
      { fact: 'Project', value: projectName },
      { fact: 'Expires in', value: `${days} day(s)` },
    ],
    alert.severity,
    appUrl,
  );

  // Telegram
  const tgText = telegramText(`📄 Document Expiring: ${docName}`, [
    `*Document:* ${docName}`,
    `*Project:* ${projectName}`,
    `*Expires in:* ${days} day(s)`,
    '',
    `[Open ManteMap](${appUrl})`,
  ]);

  return {
    email: { subject, html },
    slack: { blocks: slackBlocks },
    teams: teamsMessage,
    telegram: { text: tgText },
  };
}

export function formatStatusIncident(
  alert: AlertLike,
  projectName: string,
  appUrl: string,
): ChannelMessages {
  const meta = (alert.metadata as Record<string, unknown>) || {};
  const itemName = String(meta.itemName ?? 'Unknown item');
  const statusName = String(meta.statusName ?? 'unknown');

  const subject = emailSubject('Incident Status', itemName);
  const htmlLines = [
    `Item: ${escapeHtml(itemName)}`,
    `Status: ${escapeHtml(statusName)}`,
    `Project: ${escapeHtml(projectName)}`,
  ];
  const html = emailHtml(`Incident Status: ${escapeHtml(itemName)}`, htmlLines, buildAppLink(projectName));

  const slackBlocks = [
    slackHeader(`🚨 Incident: ${itemName}`),
    slackSection(`*Item:* ${itemName}\n*Status:* ${statusName}\n*Project:* ${projectName}`),
    slackDivider(),
    slackButton('Open ManteMap', appUrl),
  ];

  const teamsMessage = teamsCard(
    `Incident: ${itemName}`,
    [
      { fact: 'Item', value: itemName },
      { fact: 'Status', value: statusName },
      { fact: 'Project', value: projectName },
    ],
    alert.severity,
    appUrl,
  );

  const tgText = telegramText(`🚨 Incident: ${itemName}`, [
    `*Item:* ${itemName}`,
    `*Status:* ${statusName}`,
    `*Project:* ${projectName}`,
    '',
    `[Open ManteMap](${appUrl})`,
  ]);

  return {
    email: { subject, html },
    slack: { blocks: slackBlocks },
    teams: teamsMessage,
    telegram: { text: tgText },
  };
}

export function formatStatusBlocking(
  alert: AlertLike,
  projectName: string,
  appUrl: string,
): ChannelMessages {
  const meta = (alert.metadata as Record<string, unknown>) || {};
  const itemName = String(meta.itemName ?? 'Unknown item');
  const statusName = String(meta.statusName ?? 'unknown');

  const subject = emailSubject('Blocked Status', itemName);
  const htmlLines = [
    `Item: ${escapeHtml(itemName)}`,
    `Status: ${escapeHtml(statusName)} (blocking)`,
    `Project: ${escapeHtml(projectName)}`,
  ];
  const html = emailHtml(`Blocked: ${escapeHtml(itemName)}`, htmlLines, buildAppLink(projectName));

  const slackBlocks = [
    slackHeader(`⛔ Blocked: ${itemName}`),
    slackSection(`*Item:* ${itemName}\n*Status:* ${statusName} (blocking)\n*Project:* ${projectName}`),
    slackDivider(),
    slackButton('Open ManteMap', appUrl),
  ];

  const teamsMessage = teamsCard(
    `Blocked: ${itemName}`,
    [
      { fact: 'Item', value: itemName },
      { fact: 'Status', value: statusName },
      { fact: 'Project', value: projectName },
    ],
    alert.severity,
    appUrl,
  );

  const tgText = telegramText(`⛔ Blocked: ${itemName}`, [
    `*Item:* ${itemName}`,
    `*Status:* ${statusName} (blocking)`,
    `*Project:* ${projectName}`,
    '',
    `[Open ManteMap](${appUrl})`,
  ]);

  return {
    email: { subject, html },
    slack: { blocks: slackBlocks },
    teams: teamsMessage,
    telegram: { text: tgText },
  };
}

export function formatStatusFinal(
  alert: AlertLike,
  projectName: string,
  appUrl: string,
): ChannelMessages {
  const meta = (alert.metadata as Record<string, unknown>) || {};
  const itemName = String(meta.itemName ?? 'Unknown item');
  const statusName = String(meta.statusName ?? 'unknown');

  const subject = emailSubject('Final Status', itemName);
  const htmlLines = [
    `Item: ${escapeHtml(itemName)}`,
    `Status: ${escapeHtml(statusName)} (final)`,
    `Project: ${escapeHtml(projectName)}`,
  ];
  const html = emailHtml(`Final Status: ${escapeHtml(itemName)}`, htmlLines, buildAppLink(projectName));

  const slackBlocks = [
    slackHeader(`✅ Final: ${itemName}`),
    slackSection(`*Item:* ${itemName}\n*Status:* ${statusName} (final)\n*Project:* ${projectName}`),
    slackDivider(),
    slackButton('Open ManteMap', appUrl),
  ];

  const teamsMessage = teamsCard(
    `Final Status: ${itemName}`,
    [
      { fact: 'Item', value: itemName },
      { fact: 'Status', value: statusName },
      { fact: 'Project', value: projectName },
    ],
    alert.severity,
    appUrl,
  );

  const tgText = telegramText(`✅ Final Status: ${itemName}`, [
    `*Item:* ${itemName}`,
    `*Status:* ${statusName} (final)`,
    `*Project:* ${projectName}`,
    '',
    `[Open ManteMap](${appUrl})`,
  ]);

  return {
    email: { subject, html },
    slack: { blocks: slackBlocks },
    teams: teamsMessage,
    telegram: { text: tgText },
  };
}

export function formatEventUpcoming(
  alert: AlertLike,
  projectName: string,
  appUrl: string,
): ChannelMessages {
  const meta = (alert.metadata as Record<string, unknown>) || {};
  const eventName = String(meta.eventName ?? 'Unknown event');
  const eventDate = String(meta.eventDate ?? 'unknown date');
  const daysUntil = Number(meta.daysUntil ?? '?');

  const subject = emailSubject('Upcoming Event', eventName);
  const htmlLines = [
    `Event: ${escapeHtml(eventName)}`,
    `Date: ${eventDate}`,
    `Days until: ${daysUntil}`,
    `Project: ${escapeHtml(projectName)}`,
  ];
  const html = emailHtml(`Upcoming Event: ${escapeHtml(eventName)}`, htmlLines, buildAppLink(projectName));

  const slackBlocks = [
    slackHeader(`📅 Upcoming: ${eventName}`),
    slackSection(`*Event:* ${eventName}\n*Date:* ${eventDate}\n*Days until:* ${daysUntil}\n*Project:* ${projectName}`),
    slackDivider(),
    slackButton('Open ManteMap', appUrl),
  ];

  const teamsMessage = teamsCard(
    `Upcoming Event: ${eventName}`,
    [
      { fact: 'Event', value: eventName },
      { fact: 'Date', value: eventDate },
      { fact: 'Days until', value: String(daysUntil) },
      { fact: 'Project', value: projectName },
    ],
    alert.severity,
    appUrl,
  );

  const tgText = telegramText(`📅 Upcoming Event: ${eventName}`, [
    `*Date:* ${eventDate}`,
    `*Days until:* ${daysUntil}`,
    `*Project:* ${projectName}`,
    '',
    `[Open ManteMap](${appUrl})`,
  ]);

  return {
    email: { subject, html },
    slack: { blocks: slackBlocks },
    teams: teamsMessage,
    telegram: { text: tgText },
  };
}

// ---------------------------------------------------------------------------
// Registry function
// ---------------------------------------------------------------------------

const formatters: Record<string, (alert: AlertLike, projectName: string, appUrl: string) => ChannelMessages> = {
  DOCUMENT_EXPIRING: formatDocumentExpiring,
  STATUS_INCIDENT: formatStatusIncident,
  STATUS_BLOCKING: formatStatusBlocking,
  STATUS_FINAL: formatStatusFinal,
  EVENT_UPCOMING: formatEventUpcoming,
};

export function formatAlertMessage(
  alertType: string,
  alert: AlertLike,
  projectName: string,
  appUrl: string,
): ChannelMessages {
  const formatter = formatters[alertType];
  if (!formatter) {
    throw new Error(`Unknown alert type: ${alertType}`);
  }
  return formatter(alert, projectName, appUrl);
}
