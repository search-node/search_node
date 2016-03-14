/**
 * @file
 * API tests.
 */

var supertest = require("supertest");
var should = require("should");

var server = supertest.agent("http://localhost:3010");

var auth = {
  "apikey": "795359dd2c81fa41af67faa2f9adbd32"
};
var token;


describe('API basic test', function() {
  
  it('Test /api exists (401)', function(done) {
    server.get("/api")
      .expect(401)
      .end(function(err, res) {

        res.status.should.equal(401);

        done();
      });
  });

  it('Authentication', function (done) {
    server.post('/authenticate')
      .send(auth)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {

        res.status.should.equal(200);

        should.exist(res.body.token);
        token = res.body.token;

        done();
      });
  });


  it('Test /api after login (200)', function(done) {
    server.get("/api")
      .set('Authorization', 'Bearer ' + token)
      .expect(200)
      .end(function(err, res) {

        res.status.should.equal(200);

        should.not.exist(err);

        done();
      });
  });

});
