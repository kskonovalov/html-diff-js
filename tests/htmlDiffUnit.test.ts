import { describe, it, expect } from 'vitest';
import { removeTagAttributes } from '../src/htmlDiff';
import { htmlDiff } from '../src/index';

// ─── removeTagAttributes ──────────────────────────────────────────────────────

describe('removeTagAttributes', () => {
  it('returns empty string unchanged', () => {
    expect(removeTagAttributes('')).toBe('');
  });

  it('returns plain text without tags unchanged', () => {
    expect(removeTagAttributes('Hello world')).toBe('Hello world');
  });

  it('leaves tags that have no attributes unchanged', () => {
    expect(removeTagAttributes('<p>text</p>')).toBe('<p>text</p>');
  });

  it('removes a single attribute', () => {
    expect(removeTagAttributes('<p class="foo">text</p>')).toBe('<p>text</p>');
  });

  it('removes multiple attributes from the same tag', () => {
    expect(removeTagAttributes('<td colspan="2" rowspan="3">x</td>')).toBe('<td>x</td>');
  });

  it('removes attributes from self-closing tags', () => {
    expect(removeTagAttributes('<img src="f.jpg" alt="bar"/>')).toBe('<img/>');
  });

  it('removes attributes from all tags in a table', () => {
    expect(
      removeTagAttributes('<table style="width:100%"><td colspan="2">cell</td></table>'),
    ).toBe('<table><td>cell</td></table>');
  });
});

// ─── htmlDiff — identical content / no-diff ───────────────────────────────────

describe('htmlDiff — identical content returns before unchanged', () => {
  it('returns empty string when both inputs are empty', () => {
    expect(htmlDiff('', '')).toBe('');
  });

  it('returns the input when both strings are identical plain text', () => {
    const text = 'Hello world';
    expect(htmlDiff(text, text)).toBe(text);
  });

  it('returns before unchanged when HTML is identical', () => {
    const html = '<p>Hello world</p>';
    expect(htmlDiff(html, html)).toBe(html);
  });

  it('returns after (with its updated attributes) when only inline styles differ', () => {
    const before = '<p style="color:red">Hello</p>';
    const after = '<p style="color:blue">Hello</p>';
    // Stripped content is identical → early return with after (new attributes applied)
    expect(htmlDiff(before, after)).toBe(after);
  });

  it('returns after when table style attributes differ but text is the same', () => {
    const before =
      '<table style="width:100%"><tr><td style="font-weight:bold">text</td></tr></table>';
    const after =
      '<table style="width:50%"><tr><td style="font-weight:normal">text</td></tr></table>';
    expect(htmlDiff(before, after)).toBe(after);
  });

  it('returns after when colspan/rowspan attributes differ but text is the same', () => {
    const before = '<table><tr><td colspan="1" rowspan="1">cell</td></tr></table>';
    const after = '<table><tr><td colspan="2" rowspan="3">cell</td></tr></table>';
    expect(htmlDiff(before, after)).toBe(after);
  });
});

// ─── htmlDiff — basic text operations ────────────────────────────────────────

describe('htmlDiff — basic text operations', () => {
  it('marks a replaced word with del/ins', () => {
    expect(htmlDiff('<p>Hello</p>', '<p>Hi</p>')).toBe(
      '<p><del>Hello</del><ins>Hi</ins></p>',
    );
  });

  it('marks an inserted word with ins (including its trailing space)', () => {
    // Tokens: <p> Hello [space] world </p>
    // After:  <p> Hello [space] beautiful [space] world </p>
    // The inserted block is "beautiful " (word + space)
    expect(htmlDiff('<p>Hello world</p>', '<p>Hello beautiful world</p>')).toBe(
      '<p>Hello <ins>beautiful </ins>world</p>',
    );
  });

  it('marks a deleted word with del (including its trailing space)', () => {
    expect(htmlDiff('<p>Hello beautiful world</p>', '<p>Hello world</p>')).toBe(
      '<p>Hello <del>beautiful </del>world</p>',
    );
  });

  it('marks appended content as inserted without any deletions', () => {
    const result = htmlDiff('<p>Hello.</p>', '<p>Hello. How are you?</p>');
    expect(result).toContain('<ins>');
    expect(result).not.toContain('<del>');
  });

  it('marks removed content as deleted without any insertions', () => {
    const result = htmlDiff('<p>Hello. How are you?</p>', '<p>Hello.</p>');
    expect(result).toContain('<del>');
    expect(result).not.toContain('<ins>');
  });

  it('marks fully replaced paragraph content', () => {
    expect(htmlDiff('<p>Foo</p>', '<p>Bar</p>')).toBe(
      '<p><del>Foo</del><ins>Bar</ins></p>',
    );
  });
});

// ─── htmlDiff — HTML structure tags ──────────────────────────────────────────

describe('htmlDiff — inline and block HTML tags', () => {
  it('marks changed text inside a <strong> tag', () => {
    expect(
      htmlDiff(
        '<p>This is <strong>bold</strong> text.</p>',
        '<p>This is <strong>important</strong> text.</p>',
      ),
    ).toBe('<p>This is <strong><del>bold</del><ins>important</ins></strong> text.</p>');
  });

  it('wraps only the text of a newly added <p> in <ins>', () => {
    // The <p> tag itself is not wrapped; only its text content gets <ins>
    expect(htmlDiff('<div><p>First</p></div>', '<div><p>First</p><p>Second</p></div>')).toBe(
      '<div><p>First</p><p><ins>Second</ins></p></div>',
    );
  });

  it('marks the text of an added <li> item with <ins>', () => {
    expect(
      htmlDiff(
        '<ul><li>A</li><li>B</li></ul>',
        '<ul><li>A</li><li>B</li><li>C</li></ul>',
      ),
    ).toBe('<ul><li>A</li><li>B</li><li><ins>C</ins></li></ul>');
  });

  it('marks the text of a removed <li> item with <del>', () => {
    expect(
      htmlDiff(
        '<ul><li>A</li><li>B</li><li>C</li></ul>',
        '<ul><li>A</li><li>B</li></ul>',
      ),
    ).toBe('<ul><li>A</li><li>B</li><li><del>C</del></li></ul>');
  });
});

// ─── htmlDiff — tables ────────────────────────────────────────────────────────

describe('htmlDiff — tables', () => {
  it('marks changed table cell content', () => {
    expect(
      htmlDiff(
        '<table><tr><td>Apple</td></tr></table>',
        '<table><tr><td>Orange</td></tr></table>',
      ),
    ).toBe('<table><tr><td><del>Apple</del><ins>Orange</ins></td></tr></table>');
  });

  it('marks changed content in a table with colspan/rowspan attributes', () => {
    const before =
      '<table><tr><td colspan="2" rowspan="1">Old value</td><td>Static</td></tr></table>';
    const after =
      '<table><tr><td colspan="2" rowspan="1">New value</td><td>Static</td></tr></table>';
    const result = htmlDiff(before, after);
    expect(result).toContain('<del>Old');
    expect(result).toContain('<ins>New');
    expect(result).toContain('Static');
  });

  it('marks a changed cell value while other cells remain equal', () => {
    const before =
      '<table><tbody><tr><td>Revenue</td><td>$1,000</td></tr></tbody></table>';
    const after =
      '<table><tbody><tr><td>Revenue</td><td>$2,000</td></tr></tbody></table>';
    const result = htmlDiff(before, after);
    expect(result).toContain('<del>$');
    expect(result).toContain('<ins>$');
    expect(result).toContain('Revenue');
  });

  it('returns after when only table style/colspan attributes differ', () => {
    const before =
      '<table style="border-collapse:collapse"><tr><td colspan="3">text</td></tr></table>';
    const after =
      '<table style="border-collapse:separate"><tr><td colspan="1">text</td></tr></table>';
    expect(htmlDiff(before, after)).toBe(after);
  });
});

// ─── htmlDiff — void / self-closing / unclosed tags ──────────────────────────

describe('htmlDiff — void, self-closing, and unclosed tags', () => {
  it('handles <br> and marks changed text after it', () => {
    expect(htmlDiff('<p>Line 1<br>Line 2</p>', '<p>Line 1<br>Line 3</p>')).toBe(
      '<p>Line 1<br>Line <del>2</del><ins>3</ins></p>',
    );
  });

  it('handles <hr> separator and marks changed section text', () => {
    expect(
      htmlDiff(
        '<div><p>Before</p><hr><p>After</p></div>',
        '<div><p>Changed</p><hr><p>After</p></div>',
      ),
    ).toBe('<div><p><del>Before</del><ins>Changed</ins></p><hr><p>After</p></div>');
  });

  it('returns after when only <img> src attribute differs (same structure)', () => {
    const before = '<p>Photo: <img src="old.jpg"> here</p>';
    const after = '<p>Photo: <img src="new.jpg"> here</p>';
    // Stripped: '<p>Photo: <img> here</p>' in both cases
    expect(htmlDiff(before, after)).toBe(after);
  });

  it('handles unclosed <li> tags (HTML4 style) and marks changed item text', () => {
    expect(
      htmlDiff('<ul><li>Item 1<li>Item 2</ul>', '<ul><li>Item 1<li>Item 3</ul>'),
    ).toBe('<ul><li>Item 1<li>Item <del>2</del><ins>3</ins></ul>');
  });

  it('handles unclosed <p> tags and marks changed content', () => {
    expect(
      htmlDiff('<div><p>First<p>Second</div>', '<div><p>First<p>Changed</div>'),
    ).toBe('<div><p>First<p><del>Second</del><ins>Changed</ins></div>');
  });
});

// ─── htmlDiff — edge cases ────────────────────────────────────────────────────

describe('htmlDiff — edge cases', () => {
  it('treats empty before as pure insertion', () => {
    expect(htmlDiff('', '<p>Hello</p>')).toBe('<p><ins>Hello</ins></p>');
  });

  it('treats empty after as pure deletion', () => {
    expect(htmlDiff('<p>Hello</p>', '')).toBe('<p><del>Hello</del></p>');
  });

  it('handles Unicode (Cyrillic) word characters correctly', () => {
    // The tokenizer uses /[\p{L}\p{N}]/u, which covers Cyrillic
    expect(htmlDiff('<p>Привет мир</p>', '<p>Привет друг</p>')).toBe(
      '<p>Привет <del>мир</del><ins>друг</ins></p>',
    );
  });

  it('handles special characters that tokenize as individual tokens', () => {
    // '.', '%', '$' are each their own token (not word chars, not whitespace)
    const result = htmlDiff('<p>4.5%</p>', '<p>5.0%</p>');
    expect(result).toContain('<del>');
    expect(result).toContain('<ins>');
    // The '%' is shared and should not be wrapped
    expect(result).toContain('%');
  });

  it('handles deeply nested structure changes', () => {
    const before = '<div><section><article><p>Old</p></article></section></div>';
    const after = '<div><section><article><p>New</p></article></section></div>';
    expect(htmlDiff(before, after)).toBe(
      '<div><section><article><p><del>Old</del><ins>New</ins></p></article></section></div>',
    );
  });
});
