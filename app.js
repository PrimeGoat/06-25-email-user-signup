const express = require('express');
const app = express();
const morgan = require('morgan');
const port = process.env.PORT || 3000;
require('dotenv').config();
const path = require('path');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const { check, validationResult } = require('express-validator');
const { userInfo } = require('os');
let MongoStore = require('connect-mongo')(session)
const bcrypt = require('bcryptjs');
const { nanoid } = require("nanoid");
//const { x } = require("./myModule");
const User = require('./models/User');
require('./lib/passport');
const mailjet = require ('node-mailjet')
.connect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE);

app.use(morgan('dev'));
app.use(cookieParser('process.env.SECRET'));
app.use(session({
	resave: false,
	saveUninitialized: false,
	secret: process.env.SESSION_SECRET,
	store: new MongoStore({
		url: process.env.MONGODB_URI,
		mongooseConnection: mongoose.connection,
		autoReconnect: true
	}),
	cookie: {
		secure: false,
		maxAge: 1000 * 60 * 5
	}
}))

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
	console.log('Session: ', req.session);
	console.log('User: ', req.user);
	next();
});

mongoose.connect(process.env.MONGODB_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useCreateIndex: true
})
.then(() => console.log('MongoDB connected'))
.catch(err=> console.log('MongoDB Error: ', err))

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Scopes variables into views
//res.locals
app.use((req, res, next) => {
	res.locals.name = "Denis";
	res.locals.user = req.user;
	res.locals.errors = req.flash('errors');
	res.locals.success = req.flash('success');

	//res.locals.useFunc = x();

	next();
})

app.get('/', (req, res) => {
	res.render('index');
});

app.get('/bootstrap', (req, res) => {
	res.render('bootstrap');
});

app.get('/register', (req, res) => {
	res.render('register');
});

app.get('/thankyou', (req, res) => {
	res.render('thankyou');
});

const auth = (req, res, next) => {
	if(req.isAuthenticated()) {
		next();
	} else {
		res.send("You are not authorized to view this");
	}
}

app.get('/logged', auth, (req, res) => {
	res.render('logged');
});

app.get('/login', (req, res) => {
	res.render('login');
});

app.get('/logout', (req, res) => {
	req.logout();
	req.flash('success', 'You are now logged out');
	res.redirect('/');
})

app.get('/changepassword', (req, res) => {
	res.render('changepassword');
});

// const validateInput = (req, res, next) => {
// 	const { email, password } = req.body;
// 	if (!email || !password) {
// 		req.flash('errors', 'All Inputs Must Be Filled');
// 		return res.redirect('/login');
// 	} else {
// 		next();
// 	}
// };

const loginCheck = [
	check('email').isEmail(),
	check('password').isLength({min: 3})
];

const loginValidate = (req, res, next) => {
	const info = validationResult(req);
	console.log(info);
	if(!info.isEmpty()) {
		req.flash('errors', 'Invalid email or password');
		return res.redirect('/login');
	}
	User.findOne({ email: req.body.email })
	.then(user => {
		if(user) {
			if(user.mustChange) {
				console.log(user.email + "Still needs to change their initial password.");
				req.flash('errors', 'Must change your initial password');
				return res.redirect('/changepassword');
			}
		}
	});

	next();
};

const changePassword = (req, res, next) => {
	User.findOne({ email: req.body.email }).then(user => {
		if(!user || !bcrypt.compareSync(req.oldPassword, user.password)) {
			req.flash('errors', 'Invalid email or password');
			return res.redirect('/changepassword');
		}
		const salt = bcrypt.genSaltSync(10);
		user.password = bcrypt.hashSync(password, salt);
		user.save()
		.then({
			next();
		})
		.catch(err => {
			console.log("Error:", err)
			next();
		});
	})
	next();
}

app.post('/changepassword', changePassword, passport.authenticate('local-login', {
	successRedirect: '/logged',
	failureRedirect: '/login',
	failureFlash: true
}));

app.post('/login', loginCheck, loginValidate, /*validateInput,*/ passport.authenticate('local-login', {
	successRedirect: '/logged',
	failureRedirect: '/login',
	failureFlash: true
}));

app.post('/register', (req, res) => {
	User.findOne({ email: req.body.email }).then(user => {
		if(user) {
			req.flash('errors', 'Account exists');
			return res.redirect(301, '/register');
			//res.status(400).json({ message: 'User exists' });
		} else {
			const newUser = new User();
			const salt = bcrypt.genSaltSync(10);
			let password = nanoid();
			console.log('Password:', password);
			const hash = bcrypt.hashSync(password, salt);

			newUser.name = req.body.name;
			newUser.email = req.body.email;
			newUser.password = hash;
			newUser.address.number = req.body.number;
			newUser.address.streetName = req.body.streetName;
			newUser.address.address2 = req.body.address2;
			newUser.address.city = req.body.city;
			newUser.address.state = req.body.state;
			newUser.address.zip = req.body.zip;

			newUser.save().then(user => {
				// req.login(user, (err) => {
				// 	if(err) {
				// 		res.status(500).json({confirmation: false, message: 'Server error', error: err});
				// 	} else {
						// Send email with password.
						mailjet
						.post("send", {'version': 'v3.1'})
						.request({
							"Messages":[{
								"From": {
									"Email": "denis.savgir@codeimmersives.com",
									"Name": "Feel the Power of Shao Khan"
								},
								"To": [{
									"Email": newUser.email,
									"Name": newUser.name
								}],
								"Subject": "Your temporary password",
								"TextPart": "Welcome to KILLSITE.  Please log in with your temporary password and then update it to something more secure!  Your password is: " + password + "\nChange your password here: http://localhost:3000/changepassword",
								"HTMLPart": "Welcome to KILLSITE.  Please log in with your temporary password and then update it to something more secure!  Your password is: " + password + "\nChange your password here: <a href=http://localhost:3000/changepassword>http://localhost:3000/changepassword</a>"
							}]
						});
						// .on('success', function (res, body) { console.log (body) })
						// .on('error', function (err) {
						// 	req.flash('errors', err);
						// 	return res.redirect(301, '/register');
						// });

						res.redirect('/thankyou');
//					}
//				});
				//res.status(200).json({ message: 'User created: ', user});
			}).catch(err => console.log('Error: ', err));
		}
	});
});



// app.get('/flash', (req, res) => {
// 	res.render('flash', {message: req.flash('info')});
// });

// app.get('/single-flash', (req, res) => {
// 	req.flash('info', 'Hi Single Flash');
// 	res.redirect('/flash');
// });

// app.get('/multiple-flash', (req, res) => {
// 	req.flash('info', ['Welcome', 'Flash Array worked']);
// 	res.redirect('/flash');
// })

app.listen(port, () => console.log('Listening on port ' + port));

// mongoose, dotenv, express, cookie-parser morgan
