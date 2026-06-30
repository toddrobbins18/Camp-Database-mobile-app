import {
  htmlToPlainText,
  messageContentPreview,
  parseMessageHtmlBlocks,
  looksLikeHtml,
} from '../messageContentUtils';

describe('messageContentUtils', () => {
  const sampleHtml =
    '<h2>Tyler Hill Daily Dashboard - 2026-06-30</h2><h3>Today\'s Events</h3><ul>' +
    '<li><strong>TBD:</strong> Light up Pickleball (evening-activity)</li></ul>';

  it('detects html content', () => {
    expect(looksLikeHtml(sampleHtml)).toBe(true);
    expect(looksLikeHtml('plain text')).toBe(false);
  });

  it('strips html for previews', () => {
    const preview = messageContentPreview(sampleHtml, 200);
    expect(preview).toContain('Tyler Hill Daily Dashboard');
    expect(preview).not.toContain('<h2>');
    expect(preview).toContain('Light up Pickleball');
  });

  it('parses dashboard html into blocks', () => {
    const blocks = parseMessageHtmlBlocks(sampleHtml);
    expect(blocks.some((b) => b.kind === 'heading' && b.text.includes('Daily Dashboard'))).toBe(true);
    expect(blocks.some((b) => b.kind === 'bullet' && b.text.includes('Pickleball'))).toBe(true);
  });

  it('htmlToPlainText decodes entities', () => {
    expect(htmlToPlainText('<p>Tom &amp; Jerry</p>')).toBe('Tom & Jerry');
  });
});
