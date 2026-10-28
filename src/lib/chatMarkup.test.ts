import { expect, test } from 'bun:test';
import { parseBlocks, parseRich } from './chatMarkup';

test('groups consecutive list lines into one list', () => {
  expect(parseBlocks('He knows:\n- Java\n* Python\n\n1. Go\nThat is all.')).toEqual([
    { type: 'p', text: 'He knows:' },
    { type: 'ul', items: ['Java', 'Python', 'Go'] },
    { type: 'p', text: 'That is all.' },
  ]);
});

test('links emails and urls without trailing punctuation', () => {
  expect(parseRich('Email teomeehua@gmail.com.')).toEqual([
    { text: 'Email ', bold: false },
    { text: 'teomeehua@gmail.com', bold: false, href: 'mailto:teomeehua@gmail.com' },
    { text: '.', bold: false },
  ]);
  expect(parseRich('See https://haydenhuan.com, thanks')[1]).toEqual({
    text: 'https://haydenhuan.com',
    bold: false,
    href: 'https://haydenhuan.com',
  });
});

test('keeps bold segments', () => {
  expect(parseRich('He uses **Spring Boot** daily')).toEqual([
    { text: 'He uses ', bold: false },
    { text: 'Spring Boot', bold: true },
    { text: ' daily', bold: false },
  ]);
});
