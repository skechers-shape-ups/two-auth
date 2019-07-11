// importing generatePool method
const generatePool = require('../../../../functions/databases/postgres/configure');
const send = require('../../../../functions/databases/postgres/send');
// URI for mock testing DB
const mockURI = 'postgresql://tester:ilovetesting@localhost:5432/two-auth-db-test';

describe('tests the pg send function', () => {
  const testPgPool = generatePool(mockURI);

  // need to investigate how to use mockSave
  const mockSave = jest.fn(x => x);

  beforeAll(() => {
    mockSave.mockClear();
  });
  class FakeClient {
    constructor(sidExists = true) {
      this.pgConnect = () => new Promise((resolve, reject) => {
        testPgPool.connect((err, database, done) => {
          if (err) {
            reject(new Error('Error connecting to Test Postgres Pool.'));
          }
          // handles if DB is undefined or null
          if (!database) {
            throw new Error('Could not find Test Database at Connection URI.');
          }
          resolve({ database, done });
        });
      });
      // old this.pgConnect mocked actual funcionality. used mockSave inside query CB
      this.client = {
        verify: {
          // copy format from test-send
          services: sid => ({
            verifications: {
              create: (obj) => {
                mockSave();
                return new Promise((resolve) => {
                  resolve(obj);
                });
              },
            },
          })
          ,
        },
      };
      this.send = send;
    }
  }

  // NOTE: WANT TO MOCK ADD ONE PERSON IN AT THE VERY BEGINNING, AND CLEAR IT OUT AT THE VERY END
  beforeEach(() => {
    testPgPool.connect((err, database, done) => {
      if (err) throw new Error('Error connecting to database beforeEach');
      database.query('DELETE FROM twoauthusers')
        .then(() => {
          done();
        }).catch((err) => {
          throw new Error('Error clearing database row');
        });
    });
  });

  afterEach(() => {
    testPgPool.connect((err, database, done) => {
      if (err) throw new Error('Error connecting to database afterEach');
      database.query('DELETE FROM twoauthusers')
        .then(() => {
          done();
        }).catch((err) => {
          throw new Error('Error clearing database row');
        });
    });
  });

  it('successfully saves to a database', async () => {
    const client = new FakeClient();
    const result = await client.send();
    expect(mockSave.mock.calls.length).toBe(1);
  });

  it('rejects with an error if no sid exists', async () => {
    const client = new FakeClient(false);
    const result = client.send();
    expect(result).rejects.toBeInstanceOf(Error);
  });

  it('successfully resolves a verification from twilio', async () => {
    const client = new FakeClient();
    const result = await client.send();
    expect(result).toBe('fakeverification');
  });
});
