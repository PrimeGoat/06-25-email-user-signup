const mongoose = require('mongoose');

const AddrSchema = new mongoose.Schema({
	number: {type: String, required: true},
	streetName: {type: String, required: true},
	address2: {type: String, required: false},
	city: {type: String, required: true},
	state: {type: String, required: true},
	zip: {type: Number, min: 5, required: true}
});

module.exports = mongoose.model('Address', AddrSchema);
