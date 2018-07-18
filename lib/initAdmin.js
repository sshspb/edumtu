const MongoClient = require('mongodb').MongoClient;
const config = require('../config');

  MongoClient.connect(config.dbUrl, function(err, client) {
    dbUser = client.db(config.dbName);
    client.db(config.dbName).collection('users').find({role: 'admin'})
    .toArray(function(err, documents) { 
      if (err) {
        console.log('Error users')
        client.close();
      } else {
        if (documents.length) {
          console.log('-- admin already exist --');
          client.close();
        } else {
          //var salt = Math.random() + '';
          //var hashedPassword = crypto.createHmac('sha1', salt).update(Password).digest('hex');
          dbUser.collection('users').insertMany([
            {
              name: "Администратор", role: "admin", login: "admin",
              salt: "0.8189392053428559", hashedPassword: "f7db7aab4b2b0c2fed80f2802df9d2d434fb3fc4" 
            }, { 
              name: "Экономист", role: "booker", login: "booker",
              salt: "0.726377866201741", hashedPassword: "3acfca4d73190f913f5510780b7f4056ac64b728"
            }, { 
              name: "Ректор", role: "booker", login: "rector",
              salt: "0.8779520790081203", hashedPassword: "96f04986abcc9274f32a069c25c6a03ce009703f"
            }], 
            function(err) {
              if (err) console.log(err);
              else console.log('-- created login/password admin/admin')
              client.close();
            }
          )
        }
      }
    });
  });
