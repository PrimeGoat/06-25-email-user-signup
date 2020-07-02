// Defining a function to display error message
function printError(elemId, hintMsg) {
    document.getElementById(elemId).innerHTML = hintMsg;
}

// Defining a function to validate form
function validateForm() {
    // Retrieving the values of form elements
    let pass1 = document.passwordForm.password.value;
    let pass2 = document.passwordForm.password2.value;

	// Check that both passwords match
	if(pass1 != pass2) {
		printError("errorMsg", "Passwords must match");
		return false;
	} else {
		return true;
	}
};
