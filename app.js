
var express = require('express');
var session = require('cookie-session');
var bodyParser = require('body-parser');
var mongourl = 'mongodb://root:123456@ds157487.mlab.com:57487/restaurant';
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var assert = require('assert');
var url = require('url');
var fileUpload = require('express-fileupload');
var cfenv = require('cfenv');
var app = express();
var users = new Array(
    {name: 'demo', password: ''},
    {name: 'abc', password: ''});

app.use(session({
   name: 'session',
   keys: ['key1', 'key2']
}));

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));
app.use(fileUpload());
// get the app environment from Cloud Foundry


app.set('view engine', 'ejs');
app.get('/', function(req, res) {
	console.log(req.session);
	if(!req.session.authenticated) {
		res.redirect('/login');
	}else if(req.session.authenticated) {

		MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		findNRestaurant(db,function(restaurant) {
			db.close();
			console.log('Disconnected MongoDB\n');
			//res.render('list',{c:restaurant});
			res.render('home',{name:req.session.username, c:restaurant});
			//res.end();
		});
	});
 } 
   //res.render('home',{name:req.session.username});
});

app.post('/signup', function(req,res) {
   var name = req.body.name;
   var password = req.body.password;

   for( var i = 0; i < users.length; i++) {
     if(users[i].name == name) {
      console.log("unsucessful");}
    }
   if (name.length > 0 && password.length > 0 ) {
   	  var x = {};
      x['name'] = name;
      x['password'] = password;
      users.push(x);
   } else {console.log("unsucessful");}
   console.log(users);
   res.redirect('/');
});

app.post('/login',function(req,res) {
	for (var i=0; i<users.length; i++) {
		if (users[i].name == req.body.name &&
		    users[i].password == req.body.password) {
			req.session.authenticated = true;
			req.session.username = users[i].name;
		}
	}
	res.redirect('/');
});


app.get('/remove', function(req, res) {

  var username = req.query.username;
  var sessionname = req.session.username;
  var criteria = req.query._id;
  if (username == sessionname) {
    MongoClient.connect(mongourl, function(err, db) {
     assert.equal(err,null);
     console.log('Connected to MongoDB\n');
       deleteOneRestaurant(db, criteria, function() {
        console.log("remove");
        db.close();
        console.log('Disconnected MongoDB\n');
        var x = 'Deletion success';
        res.render('showMessage', {message:x});
      });
    });
  } else {
     var messageWrong = "You are not the creator!";
     res.render('showMessage',{message:messageWrong});
  }
});

//_____________________________
//_____________________________
var rateurl;
//Gobal Variable;
//_____________________________
//_____________________________
app.get('/rate', function(req,res) {
  var criteria = req.query._id;
  var name = req.query.username;

  rateurl = url.parse(req.url,true);
  MongoClient.connect(mongourl, function(err, db) {
      assert.equal(err,null);
      console.log('Connected to MongoDB\n');
      findOneRestaurant(db,criteria,function(restaurant) {
        db.close();
        console.log('Disconnected MongoDB\n');
        //can find the restaurant
        var rate = restaurant.rate;
        console.log(rate);
     if( rate == undefined && req.session.username == name) {
       res.render('rate',{resID: criteria});
     } else {
       var message = "You are not creator OR the restaurant had been rated!"
       res.render('showMessage', {message:message});
         } 
      });
    });
   //console.log(restaurantRate);
}); 


app.post('/rateRestaurant', function(req, res){
     var queryAsObject = rateurl.query; //{_id:xxxxx, username:xxx}
     var id = queryAsObject._id;
     var ratescore = req.body.rate;
     console.log(id);
     console.log(ratescore);

    MongoClient.connect(mongourl, function(err, db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB\n');
    rateOneRestaurant(db, id, ratescore, function() {
      db.close();
      console.log('Disconnected MongoDB\n');
      var message = "The restaurant has been rated"
      res.render('showMessage',{message:message});
      //res.end();
    });
  }); 
});

app.get('/logout',function(req, res) {
  req.session = null;
  res.redirect('/');
});

app.get('/signup', function(req, res) {
  res.sendFile(__dirname + '/public/signup.html');
});

app.get('/login', function(req, res) {
  res.sendFile(__dirname + '/public/login.html');
});

app.get('/createRestaurant', function(req, res) {
  res.sendFile(__dirname + '/public/createRestaurant.html');
});


app.post('/create', function(req, res) {
    var name = req.body.name;
    var cuisine = req.body.cuisine;
    var street = req.body.street;
    var building = req.body.building;
    var zipcode = req.body.zipcode;
    var log = req.body.longitude;
    var lat = req.body.latitude;
    var borough = req.body.borough;
    var username = req.session.username;
    var sampleFile = (req.files != null) ? new Buffer(req.files.sampleFile.data).toString('base64') : null;
    var mimetype = req.files.sampleFile.mimetype;
    var mimetypeCheck = "application/octet-stream";
    var coord = [];
        coord.push(log);
        coord.push(lat);
    var lengthOfArray = coord[0].length + coord[1].length;
    MongoClient.connect(mongourl,function(err,db) {
      console.log('Connected to mlab.com');
      assert.equal(null,err);
      create(db,name,cuisine,street,building,zipcode,log,lat,borough,username,sampleFile, mimetype,function(result) {
          db.close();
          if (result.insertedId != null) {
            if(lengthOfArray == 0) {
              var display = "noGoogleMap";
              var googleMap = "https://webmix.mybluemix.net/";
          } else {
              var display = "hasGoogleMap";
              var googleMap = " https://www.google.com/maps/preview/@" + log + "," + lat + ",20z";} 

         if (mimetype == mimetypeCheck) {
             var imageToshow = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxENEBITExIVEBUXGCEYFxgSERgXGhUdGxoWGRcXFxwaHjQgGR4lJx0YITchJSkrLi4uFys1ODcsNyguLisBCgoKDQwNGg8PGjcmHyY3NTcvNzcvOC8wLTcvNTc1Li03KzU1NS0vODguODg1LTU3LTg1NS0tNS0vNzc1NS01Nf/AABEIAEUARQMBIgACEQEDEQH/xAAbAAACAwEBAQAAAAAAAAAAAAAABQQGBwMCAf/EAD8QAAECAwQGBgcECwAAAAAAAAECAwAEEQUSITEGE0FRYXEHMoGRscEVIkJyocLRFFJikiMkJVRkc4KEssPh/8QAGgEAAgMBAQAAAAAAAAAAAAAAAwQBAgUABv/EACYRAAICAQMDAwUAAAAAAAAAAAECAAMRBBIxITJBE1FxBSIzYeH/2gAMAwEAAhEDEQA/ANS0u0paspoKUNY4vBtsGhVTMnckbTGdr0xtebJLSgyNgZZSqnMrBqe6OVvk2jbLyVH1UKDSRuSgC93m8YvknKpbSEpASBujB1/1F67NiRSy1t21ZRVi2XcVTMwOS0t/40iC/Lzo686+eH25Z+AVF5tyXacWwhxVwFRqeFPM0EVe0mmmpl5lBKtWQDUZVFacf+wCu3UWV+qW6Sv34yTESmHjm88ecw59YBLvDJ54cphf1hvqxuj5qxujvWf3ldx94ubfnW+pNzKf7lah3FVPhFh0X6Qphh1LU6rWtqNNYUhKm64AqugBSeNKjjC8tCFNsS4KTUZeEGq1VitzLLYwM38GsEVro5tEzVnMFRqpFW1E5m4SkE8SLp7Y+xvKdwBEcByJntkq/bM0T+8PfBS4s50laAN1KieNAO+sU3Xam1JpX8U78VL+sSJBBdoEi8VHDtjy+oqD3kmIt3mSp2cW8srUcdlMhuAibbEm46+HUNrUl1pCiUoJAUPVVU78u6HvopFnSzj5b+0OoQVUArkK0QPOJGiFtPTzalOtFkgimNQQeNB4RqU6PanpucZ8fEOtfTDeZSHG1INFJKfeBHjHmNSmpRDySlaQocRFMtPRpTThuqSG87y1ABPAwK7QOnVOsq1JHEQQvtcgIPGHzds2ZK30Lc+0qIzQ2VBNNxG2KfOTWuF6hAxoDu2QB9O1eCT/ACUZCOZpPQy5WTmE7pg07W2T9YI8dDA/Vpr+f/qagjco/GsbTtEpWkyLlozwy/TV/MkK84caJWXNECZZum6rBKva3xE02lT6YmUgYuatQ7W0J8UmNQsiREsw22PZGPPbCNenD3sT4gVTLmQ7O0iaeVq1gsPDNtzA80n2hyhs2BT1aU4ZfCIdq2SxOJuuoCtxyUk70kYgxX12VaEiay7om2/uPKuuAbgvJX9QjQyRzD8RxpQZkSyzLAKd2AxX3pWZnrJfRNt0cTVSMKXrlFJJGzGohlJaXNXgiZSuTcyo+m6CeCuqrsMOLSmUBharwKbudRSm2IIDeekjmYiylIAugAEYUjxNZQSAOqb90R5m8o8+O6JeZqXQ63dknzvmCe5tlPlBEzoqau2ck/edcPctSflj7G/SMVr8R1O0Rdb9n3rflVHJTNeZaKz8yYuMJtNpR1Oom2UaxyWUSUDNbaxRwDjgD2R7sbSOVnUhTbqa7UqUAoHcQYlQFY/ucOhMbQQCPsElpzfYS4ClaQsHYoVEZr0iWJKSqG7iS2pxd242opSRiSSkYUw3RphWBmQO2Md03tlM3PG6aoZBSMcCo9YjwhfVMFqJlLDhYvQigoBkNm6IUwrEc4Z2XaRBLYKUheajmBtAJyrHCZlEzL7bEumq1+rhjnmo8AMSeEYFe42bcRIZ3Ymx6AsaqzJQb2wv89V+cEOpOXDLaGxkhISOQFII9MowAI+J2hFaeh8hNqK3JZBUc1JqhR5lBBMEEcQDzJi9XR5JDqGYa9yac+YmODnR22erPTyOUwk+KIIIjYsjAkV/o0v4ekZsj8S0nyiKjolaSKCbc7WkQQRVqUbkSCoM6I6J2PamniPwpbT4pMWnR7RWUs0HUt+ucC4s3lnhU5DgKCCCOWpE6qJwUDiO4IIIJLT/2Q=="
         } else {
          var imageToshow = "data:" + mimetype +";base64," + sampleFile;}
            res.render('create',{ display:display, googleMap:googleMap, image:imageToshow, name:name,borough:borough, cuisine:cuisine, username:username, street:street,
                   building:building, zipcode:zipcode, lat:lat, log:log});
          } else {
            res.status(500);
            res.end(JSON.stringify(result));
          }
      });
    });
});


//_____________________________
//_____________________________
var editPartID;
//Gobal Variable;
//_____________________________
//_____________________________

app.get("/edit", function(req,res) {
      editPartID = req.query._id;
  var name = req.query.username;
  if (req.query.username != req.session.username) {
    var x = "You are not the creator";
    res.render('showMessage', {message:x});
  } else {
    MongoClient.connect(mongourl, function(err, db) {
     assert.equal(err,null);
     console.log('Connected to MongoDB\n');
       findOneRestaurant(db, editPartID, function(restaurant) {
        var id = restaurant._id;
        var street = restaurant.address.street;
        var building = restaurant.address.building;
        var zipcode = restaurant.address.zipcode;
        var lat = restaurant.address.coord[0];
        var log = restaurant.address.coord[1];
        var name = restaurant.name;
        var borough = restaurant.borough;
        var user = restaurant.user;
        var cuisine = restaurant.cuisine;
        res.render('edit', {restaurantname:name, boroughname:borough,
        cuisinename: cuisine, streetname:street,
        buildingname: building, zipcodename:zipcode,
        long: log, lat:lat});
      });
    });
  }
});

app.post('/editRestaurant', function(req,res) {
  var idToFind = editPartID;
  var restaurantname = req.body.name;
  var cuisine = req.body.cuisine;
  var street = req.body.street;
  var building = req.body.building;
  var zipcode = req.body.zipcode;
  var long = req.body.longitude;
  var lat = req.body.latitude;
  var borough = req.body.borough;
  var username = req.session.username;
  var sampleFile = (req.files != null) ? new Buffer(req.files.sampleFile.data).toString('base64') : null;
  var mimetype = req.files.sampleFile.mimetype;
  MongoClient.connect(mongourl,function(err,db) {
      console.log('Connected to mlab.com');
      assert.equal(null,err);
      editOneRestaurant(db,idToFind,restaurantname,cuisine,street,building,zipcode,long,lat,borough,username,sampleFile, mimetype,function() {
          db.close();
          var x = "The restaurant has been edited";
           res.render('showMessage',{message:x});
      });
    });
});

app.get('/display', function(req,res) {
    MongoClient.connect(mongourl, function(err, db) {
      assert.equal(err,null);
      console.log('Connected to MongoDB\n');
      var criteria = req.query._id;
      console.log(criteria);
      findOneRestaurant(db,criteria,function(restaurant) {
        db.close();
        var id = restaurant._id;
        var street = restaurant.address.street;
        var building = restaurant.address.building;
        var zipcode = restaurant.address.zipcode;
        var lat = restaurant.address.coord[0];
        var log = restaurant.address.coord[1];
        var name = restaurant.name;
        var borough = restaurant.borough;
        var user = restaurant.user;
        var cuisine = restaurant.cuisine;
        var image = restaurant.data;
        var mimetype = restaurant.mimetype;
        var rate = restaurant.rate != null ? restaurant.rate: "No Rate";
        var mimetypeCheck = "application/octet-stream";
        var lengthOfArray = restaurant.address.coord[0].length + restaurant.address.coord[1].length;
        console.log(lengthOfArray);
  
        if(lengthOfArray == 0) {
          var display = "noGoogleMap";
          var googleMap = "https://webmix.mybluemix.net/";
        } else {
          var display = "hasGoogleMap";
           var googleMap = " https://www.google.com/maps/preview/@" + log + "," + lat + ",20z";
        }

        if(mimetype == mimetypeCheck) {
          var imageToshow = "data:image/jpeg;base64,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"
        }else {
          var imageToshow = "data:" + mimetype +";base64," + image;
        }
        res.render('displaydetails',{ display:display, googleMap:googleMap, image:imageToshow, id:id,name:name,borough:borough, cuisine:cuisine, username:user, street:street,
                   building:building, zipcode:zipcode, lat:lat, log:log, rate:rate});
        console.log('Disconnected MongoDB\n');
        res.end();
      });
    });
});

app.get('/api/read/name/:restauranname',function(req,res){
    var name = req.params.restauranname;
    MongoClient.connect(mongourl,function(err,db) {
      console.log('Connected to mlab.com');
      assert.equal(null,err);
      findNameRestaurant(db, name,function(restaurant) {
          db.close();
          res.writeHead(200, {"Content-Type": "text/plain"});
          res.end(JSON.stringify(restaurant));
      });
    });
});

app.get('/api/read/borough/:boroughname',function(req,res){
var name = req.params.boroughname;
MongoClient.connect(mongourl,function(err,db) {
      console.log('Connected to mlab.com');
      assert.equal(null,err);
      findBoroughRestaurant(db, name,function(restaurant) {
          db.close();
          res.writeHead(200, {"Content-Type": "text/plain"});
          res.end(JSON.stringify(restaurant));
      });
    });
});

app.get('/api/read/cuisine/:cuisinename',function(req,res){
var name = req.params.cuisinename;
MongoClient.connect(mongourl,function(err,db) {
      console.log('Connected to mlab.com');
      assert.equal(null,err);
      findCuisineRestaurant(db, name,function(restaurant) {
          db.close();
          res.writeHead(200, {"Content-Type": "text/plain"});
          res.end(JSON.stringify(restaurant));
      });
    });
});

function findNameRestaurant(db, criteria, callback) {
    db.collection('restaurant').find({"name":criteria}).toArray(function(err,result){
        assert.equal(err,null);
        callback(result);
      });
}

function findBoroughRestaurant(db, criteria, callback) {
    db.collection('restaurant').find({"borough":criteria}).toArray(function(err,result){
        assert.equal(err,null);
        callback(result);
      });
}

function findCuisineRestaurant(db, criteria, callback) {
    db.collection('restaurant').find({"cuisine":criteria}).toArray(function(err,result){
        assert.equal(err,null);
        callback(result);
      });
}
function create(db,name,cuisine,street,building,zipcode,log,lat,borough,username,sampleFile,mimetype, callback) {
  var address = {};
  address.street = street;
  address.building = building;
  address.zipcode = zipcode;
  address['coord'] = [];
  address.coord.push(lat);
  address.coord.push(log);
  db.collection('restaurant').insertOne({
    address,
  	"name" : name,
    "borough": borough,
  	"cuisine" : cuisine,
  	"user" : username,
  	"data" : sampleFile,
  	"mimetype": mimetype,
  	}, function(err,result) {
    //assert.equal(err,null);
    if (err) {
      result = err;
      console.log("insertOne error: " + JSON.stringify(err));
    } else {
      console.log("Inserted _id = " + result.insertedId);
    }
    callback(result);
  });
}

function findNRestaurant(db,callback) {
		db.collection('restaurant').find().toArray(function(err,result) {
			assert.equal(err,null);
			callback(result);
		});
};

function findOneRestaurant(db,criteria,callback) {
    db.collection('restaurant').findOne({"_id":ObjectId(criteria)},function(err,result) {
        assert.equal(err,null);
        callback(result);
    });
}

function deleteOneRestaurant(db, criteria, callback) {
    db.collection('restaurant').deleteOne({"_id":ObjectId(criteria)}, 
      function(err, result) {
        assert.equal(err,null)
        callback();
    });
}

function rateOneRestaurant(db, criteria, rate, callback) {
    db.collection('restaurant').updateOne(
      {"_id":ObjectId(criteria)}, 
      {$set: {"rate":rate}},
      function(err, result) {
        assert.equal(err,null);
        callback();
    });
}

function editOneRestaurant(db, criteria, name,cuisine,street,building,zipcode,log,lat,borough,username,sampleFile,mimetype, callback) {
  var address = {};
  address.street = street;
  address.building = building;
  address.zipcode = zipcode;
  address['coord'] = [];
  address.coord.push(lat);
  address.coord.push(log);
  db.collection('restaurant').replaceOne(
      {"_id":ObjectId(criteria)}, 
      {address,
      "name" : name,
      "cuisine" : cuisine,
      "borough" : borough,
      "user" : username,
      "data" : sampleFile,
      "mimetype": mimetype},
      function(err) {
    //assert.equal(err,null);
    if (err) {
      result = err;
      console.log("updatetOne error: " + JSON.stringify(err));
    } 
    callback();
  });
}

var appEnv = cfenv.getAppEnv();

//appEnv.port, 
// start server on the specified port and binding host
app.listen(appEnv.port,'0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on ");
});
