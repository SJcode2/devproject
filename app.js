require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const encrypt = require("mongoose-encryption");


const app = express();
app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.use(express.static("public"));

app.set("view engine", "ejs");

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));


app.use(passport.initialize());

app.use(passport.session());

mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});

const userSchema = new mongoose.Schema({
    name: String,
    username: String,
    password: String,
    age: String,
    type: String,
    address: String,
    phone: String
});



userSchema.plugin(passportLocalMongoose);

const User = mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());




const patientSchema = new mongoose.Schema({
    name: String,
    username: String,
    age: String,
    address: String,
    phone: String,
    status: Array
});

const Patient = mongoose.model('Patient', patientSchema);


const familySchema = new mongoose.Schema({
    uid: {type: mongoose.Schema.Types.ObjectId, ref: 'userSchema'},
    name: String,
    username: String
});

const Family = mongoose.model('Family', familySchema);

const nurseSchema = new mongoose.Schema({
    uid: {type: mongoose.Schema.Types.ObjectId, ref: 'userSchema'},
    name: String,
    username: String,
    hospital: String,
    department: String
});

const Nurse = mongoose.model('Nurse', nurseSchema);

const grantSchema = new mongoose.Schema({
    patientPhone: String,
    visitorEmail: String
});

const Grant = mongoose.model('Grant', grantSchema);





class People {

    async getUserInfo(userid) {
        let userInfo = await User.findById(userid).exec();
        return userInfo;
    }

    async addUserInfo(userid, name, username, type) {
        if (type === 'family') {
            let family = new Families();
            return await family.addFamilyInfo(userid, name, username);
        }
        if (type === 'nurse') {
            let nurse = new Nurses();
            return await nurse.addNurseInfo(userid, name, username);
        }
    }

    async removeUser(userID) {
        try {
            await User.findByIdAndDelete(userID).exec();
        } catch (error) {
            console.log('user not found');
        }
    }
    
}





// ********************************** FAMILIES ************************************



class Families {


    async getFamilyInfo(userID) {
        let familyInfo = await Family.find({uid: userID}).exec();
        return familyInfo;
    }

    async addFamilyInfo(userid, name, username) {

        const newFamily = new Family({
            uid: userid,
            name: name,
            username: username
        });
        newFamily.save();
        return newFamily;
    }

    async monitorPatient(patientName) {
        let patientInfo = await Patient.find({name: patientName}).exec();
        return patientInfo;
    }
    
}







// ********************************** PATIENTS ************************************


class Patients {


    async getPatientInfo(name) {
        let patientInfo = await Patient.find({name: name}).exec();
        return patientInfo;
    }

    async getByPhone(patientPhone) {
        let patientInfo = await Patient.find({phone: patientPhone}).exec();
        return patientInfo;
    }

    async getById(pId) {
        let patientId = await Patient.findById(pId).exec();
        return patientId;
    }

    async addPatientInfo(name, username, age, address, phone) {
        const newPatientInfo = new Patient({
            name: name,
            username: username,
            age: age,
            address: address,
            phone: phone
        });
        // check status data type
        newPatientInfo.save();
        return newPatientInfo;
    }

    async removePatient(name) {

    }

    async updatePatientStatus(name, status) {
        let getID = await this.getById(name);
        let resultID = await Patient.findOneAndUpdate({_id: getID._id}, {$push: {status: status}}).exec();
        console.log(resultID);
        return resultID;
    }

    
}



// ********************************** NURSES ************************************



class Nurses {


    async getNurseInfo(nurseID) {
        let nurseInfos = await Nurse.find({uid: nurseID});
        return nurseInfos;
    }

    async addNurseInfo(userid, name, username) {
        const newNurse = new Nurse({
            uid: userid,
            name: name,
            username: username
        });
        newNurse.save();
        return newNurse;
    }

    async updateNurse(nurseID, hospital, department) {
        let getNurseId = await this.getNurseInfo(nurseID);
        let nurseinfo = await Nurse.findOneAndUpdate({_id: getNurseId[0]._id}, {$set: {hospital: hospital, department: department}}).exec();
        return nurseinfo;
    }
}


class Visitor {
    async addVisitor(patientPhone, visitorEmail) {
        const newGrant = new Grant({
            patientPhone: patientPhone,
            visitorEmail: visitorEmail
        });
        newGrant.save();
    }

    async showPatients(visitorId) {
        let families = new Families();
        let finfo = await families.getFamilyInfo(visitorId);
        let verifyFam = await Grant.find({visitorEmail: finfo[0].username}).exec();
        let patients = new Patients();
        let patientInfo = await patients.getByPhone(verifyFam[0].patientPhone);
        return patientInfo;
    }

    async showStatus(patientId) {
        let patientInfo = await Patient.findById(patientId).exec();
        return patientInfo.status;
    }
}


module.exports = { People, Families, Patients, Nurses, Visitor };







// #################################################    API SECTION ############################################################



app.get('/viewStatus', async (req, res) => {
    let patients = new Patients();
    let patientInfo = await patients.getById(req.query.id);
    res.render('status', {info: patientInfo});
});

app.post('/newVisitor', async (req, res) => {
    let visitor = new Visitor();
    await visitor.addVisitor(req.body.phone, req.body.username);
    res.redirect(`/visitor?id=${req.body.id}`);
});

app.get('/visitor', async (req, res) => {
    res.render('visitor', {info: req.query.id});
});



app.get('/detailspt', async (req, res) => {
    let patient = new Patients();
    let patientDetails = await patient.getById(req.query.id);
    res.render('patient', {info: patientDetails});
});




app.post('/newPatient', async (req, res) => {
    let patient = new Patients();
    await patient.addPatientInfo(req.body.name, req.body.username, req.body.age, req.body.address, req.body.phone);
    res.redirect('/nurse');
});



app.get('/patientStatus', async (req, res) => {
    let patient = new Patients();
    let getInfoPatient = await patient.getPatientInfo(req.query.name.toLowerCase());
    res.render('patientStatus',
    {status: getInfoPatient[0].status,name: getInfoPatient[0].name});
});



app.post('/addStatus', async (req, res) => {
    let patient = new Patients();
    let status = new Object();
    status['nurse'] = req.body.name
    status['time'] = req.body.date;
    status['notes'] = req.body.notes;
    await patient.updatePatientStatus(req.body.id, status);
    res.redirect(`/detailspt?id=${req.body.id}`);
});



app.get('/nurse', async (req, res) => {
    let getAllPatients = await Patient.find({}).exec();
    console.log(getAllPatients);
    res.render('nurse', {info: getAllPatients});
});

app.post('/nurse', async (req, res) => {
    res.redirect('/nurse');
});

app.get('/family', async (req, res) => {
    let visitor = new Visitor();
    let infos = await visitor.showPatients(req.user.id);
    res.render('family', {info: infos});
});

app.post('/family', async (req, res) => {
    res.redirect('/family');
});

app.post("/register", function(req, res){
    User.register({
        username: req.body.username,
        name: req.body.name,
        address: req.body.address,
        age: req.body.age,
        type: req.body.type,
        phone: req.body.phone
    }, req.body.password, function(err, profs){
        if (err){
            console.log(err);
        } else {
            passport.authenticate("local");
            let userid = profs._id;
            let name = req.body.name;
            let username = req.body.username;
            let type = req.body.type;
            let users = new People();
            let callUserFun = async () => {
                await users.addUserInfo(userid, name, username, type);
            }
            callUserFun().then((result) => {
                console.log(result);
            });
            passport.authenticate("local")(req, res, function(){
                if(req.body.type === 'family') {
                    res.redirect('/family');
                } else {
                    res.redirect('/nurse');
                }
            });
        }
    });
});



app.get('/', async (req, res) => {
    res.render('register');
});

app.get('/login', async (req, res) => {
    res.render('login');
});


app.post("/login", function(req, res){

    const newProfs = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(newProfs, function(err){
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){
                User.find({username: req.body.username}, function(err, results){
                    if(results[0].type == "nurse"){
                        res.redirect("/nurse");
                    } else {
                        res.redirect("/family");
                    }
                });
               
            });
        }
    });
});



app.post("/logout", function(req, res){
    req.logout(function(err) {
        if(err) {
            console.log(err);
        } else {
            res.redirect("/");
        }
    });
});



app.listen(process.env.PORT || 3000, function(){
    console.log("Server started successfully");
});
