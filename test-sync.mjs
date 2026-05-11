import { readInbox } from './lib/graph-mail.js';

async function test() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  console.log("Since:", since);
  const msgs = await readInbox({
    fromAddresses: ['prabirsiyag@gmail.com'],
    since
  });
  console.log('Messages:', msgs);
}
test().catch(console.error);
