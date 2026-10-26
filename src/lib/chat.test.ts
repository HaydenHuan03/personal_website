import { expect, test } from 'bun:test';
import { parseReply, whatsappUrl } from './chat';

test('strips the contact token and flags contact', () => {
  expect(parseReply("I don't have that information about Hayden.\n[[CONTACT]]")).toEqual({
    text: "I don't have that information about Hayden.",
    wantsContact: true,
  });
});

test('hides a contact token that is still streaming in', () => {
  expect(parseReply('Not sure. [[CON').text).toBe('Not sure.');
  expect(parseReply('Not sure. [[CONTACT]').text).toBe('Not sure.');
});

test('flags contact when the model forgets the token', () => {
  expect(parseReply("Sorry, I don't have that information.").wantsContact).toBe(true);
});

test('a normal answer needs no contact buttons', () => {
  expect(parseReply('Hayden uses Java and Python.')).toEqual({ text: 'Hayden uses Java and Python.', wantsContact: false });
});

test('whatsapp link carries the question', () => {
  const url = whatsappUrl('What is his salary?');
  expect(url.startsWith('https://wa.me/60102770108?text=')).toBe(true);
  expect(decodeURIComponent(url)).toContain('What is his salary?');
});
