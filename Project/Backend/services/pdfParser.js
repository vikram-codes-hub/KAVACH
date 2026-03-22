const pdf = require('pdf-parse');

const extractText = async (buffer) => {
  try {
    const data = await pdf(buffer);
    const text = data.text;

    if (!text || text.trim().length === 0) {
      console.warn('[PDF] Extracted text is empty');
      return '';
    }

    const cleaned = text
      .replace(/\x00/g, '')
      .replace(/\f/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .replace(/[ \t]{3,}/g, '  ')
      .trim();

    console.log(`[PDF] Extracted ${cleaned.length} characters from PDF`);
    return cleaned;

  } catch (err) {
    console.error('[PDF] Extraction failed:', err.message);
    return '';
  }
};

module.exports = { extractText };