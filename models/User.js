const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
	name: {type: String, required: true, lowercase: true},
	email: {type: String, unique: true, required: true, lowercase: true},
	password: {type: String, required: true, min: 3},
	mustChange: {type: Boolean, required: true, default: true},
	address: {
		number: {type: String, required: true},
		streetName: {type: String, required: true},
		address2: {type: String, required: false},
		city: {type: String, required: true},
		state: {type: String, required: true},
		zip: {type: Number, min: 5, required: true}
	}
});

module.exports = mongoose.model('User', UserSchema);
