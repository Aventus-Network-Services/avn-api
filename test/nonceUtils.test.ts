import assert from 'assert';
import { NonceUtils } from '../lib/utils/nonceUtils';
import { NonceType } from '../lib/interfaces';

// Mock Query object with only getAnchorNonce implemented
const mockQuery = {
  getAnchorNonce: async (chainId: string): Promise<string> => `anchor-${chainId}`
} as any;

(async () => {
  // Expect error when chainId is missing
  let threw = false;
  try {
    NonceUtils.createNonceFetcher({ nonceType: NonceType.Anchor, nonceParams: {} }, mockQuery);
  } catch (err) {
    threw = true;
  }
  assert.ok(threw, 'Expected error when chainId is missing');

  // Expect returned function to call getAnchorNonce with provided chainId
  const fetcher = NonceUtils.createNonceFetcher(
    { nonceType: NonceType.Anchor, nonceParams: { chainId: '5' } },
    mockQuery
  );
  const value = await fetcher();
  assert.strictEqual(value, 'anchor-5');

  console.log('All tests passed');
})();

