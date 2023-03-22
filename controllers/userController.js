const User = require('../models/userModel')
const Product = require('../models/productModel')
const bcrypt = require('bcrypt')
const config = require("../config/config")
const randormString = require("randomstring")
const nodemailer = require("nodemailer")
const env = require('dotenv').config();

//passwrodHashing
const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
    } catch (error) {
        console.log(error.message);
    }
}

//load sign page
const loadSignup = async (req, res) => {
    try {
        res.render("signup")
    } catch (error) {
        console.log(error.message);
    }
}

//sending otp for registration
const sendRegisterOtp = async (req, res) => {
    try {
        const checkExist = await User.findOne({ mobile: req.body.phone })
        if (checkExist) {
            res.render('signup', { exist: "Number Already Registered, Please Login" })
        } else {
            req.session.userData = req.body
            client.verify.v2.services('VA5cbb1853d0d0df5ffde3e55a126dd812')
                .verifications

                .create({ to: '+91' + req.body.phone, channel: "sms" })
                .then((verification) => console.log(verification.status))
            req.session.mobile = req.body.phone
            res.redirect('/verify')
        }
    } catch (error) {
        console.log(error.message);
    }
}

//load register enter otp page
const loadEnterOtp = async (req, res) => {
    try {
        if (req.session.mobile) {
            res.render('enter-otp')
        } else {
            res.sendStatus(400)
        }

    } catch (error) {
        console.log(error.message);
    }
}

const verifyOtpAndSave = async (req, res) => {

    try {
        client.verify.v2.services('VA5cbb1853d0d0df5ffde3e55a126dd812')
            .verificationChecks
            .create({ to: '+91' + req.session.userData.phone, code: req.body.otp })
            .then((verification) => {
                if (verification.status === "approved") {
                    console.log(verification.status);
                    (async () => {
                        const spassword = await securePassword(req.session.userData.password);
                        const user = new User({
                            name: req.session.userData.name,
                            email: req.session.userData.email,
                            mobile: req.session.userData.phone,
                            password: spassword,
                            is_verified: 1
                        })
                        const userData = await user.save()
                        if (userData) {
                            req.session.user_id = userData._id
                            res.redirect('/')
                        } else {
                            res.sendStatus(404)
                        }
                    })()
                } else {
                    res.render('enter-otp', { message: " Incorrect otp" })
                }
            })
    } catch (error) {
        console.log(error.message);
    }
}

// for Load Login page
const loadLogin = async (req, res) => {
    try {
        res.render("login")
    } catch (error) {
        console.log(error.message);
    }
}

//verify customer Login
const verifyLogin = async (req, res) => {

    try {
        const mobile = req.body.mobile
        const password = req.body.password
        const userData = await User.findOne({ mobile: mobile })

        if (userData) {
            const passwordMatch = await bcrypt.compare(password, userData.password)
            if (passwordMatch) {
                if (userData.is_verified === 1) {
                    if (userData.is_blocked === 0) {
                        req.session.user_id = userData._id
                        res.redirect('/')
                    } else {
                        res.render('login', { message: "You were Blocked" })
                    }
                } else {
                    res.render('login', { message: "Please Verify Your Number" })
                }
            } else {
                res.render('login', { message: "Phone or Password is incorrect" })
            }
        } else {

            res.render('login', { message: "Phone or Password is incorrect" })
        }
    } catch (error) {
        console.log(error.message)
    }
}

//load forgot password 
const forgetLoad = async (req, res) => {
    try {
        res.render('forgot')
    } catch (error) {
        console.log(error.message)
    }
}

//  send mail for reset password
const sendResetPasswordMail = async (name, email, token) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.email,
                pass: process.env.emailPass
            }
        })
        const mailOptions = {
            from: config.email,
            to: email,
            subject: 'Reset Your Password From Decore-Fashion',
            html: '<p> Hii  ' + name + ' , please click here to  <a href="http://localhost:3000/reset_password?token=' + token + ' " >Reset  </a> your Password.</p>'
        }
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log("Email has been sent:- ", info.response);
            }
        })
    } catch (error) {
        console.log(error.message);
    }
}

//for forget password verify
const forgetVerify = async (req, res) => {

    try {
        const email = req.body.email
        const userData = await User.findOne({ email: email })
        if (userData) {
            if (userData.is_verified === 0) {
                res.render('forgot', { message: "Please Verify your Mail" })
            } else {
                const randomString = randormString.generate()
                const updatedData = await User.updateOne({ email: email }, { $set: { token: randomString } })
                sendResetPasswordMail(userData.name, userData.email, randomString)
                res.render('forgot', { successmessage: "Please Check your mail" })
            }
        } else {
            res.render('forgot', { message: "Email is incorrect" })
        }
    } catch (error) {
        console.log(error.message)
    }
}

// for load reset password page
const resetPasswordLoad = async (req, res) => {

    try {
        const token = req.query.token
        const tokenData = await User.findOne({ token: token })
        if (tokenData) {
            res.render('reset-password', { user_id: tokenData._id })
        } else {
            res.sendStatus(400)
        }
    } catch (error) {
        console.log(error.message)
    }
}

const resetPassword = async (req, res) => {

    try {
        const password = req.body.password
        const user_id = req.body.user_id
        const secure_pass = await securePassword(password)
        const updatedData = await User.findByIdAndUpdate({ _id: user_id }, { $set: { password: secure_pass, token: '' } })
        res.redirect("/login")
    } catch (error) {
        console.log(error.message)
    }
}

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const client = require('twilio')(accountSid, authToken);

const loadLoginWithOtp = async (req, res) => {
    try {
        res.render('otp-login')
    } catch (error) {
        console.log(error.message);
    }
}

const otpGeneration = async (req, res, next) => {

    try {
        const mobile_No = req.body.phone
        const userData = await User.findOne({ mobile: mobile_No })

        if (userData) {
            client.verify.v2.services('VA5cbb1853d0d0df5ffde3e55a126dd812')
                .verifications

                .create({ to: '+91' + mobile_No, channel: "sms" })
                .then((verification) => console.log(verification.status))
            req.session.mobile = req.body.phone
            res.redirect('/otp_verify')
        } else {
            res.render('otp-login', { message: "Your Number is not Registered" })
        }
    } catch (error) {
        console.log(error.message);
    }
}

const otpVerification = async (req, res) => {

    try {
        const userData = await User.findOne({ mobile: req.session.mobile })
        client.verify.v2.services('VA5cbb1853d0d0df5ffde3e55a126dd812')
            .verificationChecks
            .create({ to: '+91' + req.session.mobile, code: req.body.otp })
            .then((verification) => {
                if (verification.status === "approved") {
                    console.log(verification.status)
                    req.session.user_id = userData._id
                    res.redirect('/')
                } else {
                    res.render('enter-otp', { message: " Incorrect otp" })
                }
            })
    } catch (error) {
        console.log(error.message);
    }
}

// for load home page
// const loadHome = async (req, res) => {

//     try {
//         const productData = await Product.find()
//         const user = await User.findById({ _id: req.session.user_id })
//         res.render('home', { product: productData, user })
//     } catch (error) {
//         console.log(error.message)
//     }
// }

const loadProfile = async (req, res) => {

    try {
        const userData = await User.findById({ _id: req.session.user_id })
        res.render('profile', { user: userData })
    } catch (error) {
        console.log(error.message)
    }
}

const loadEditProfilePage = async (req, res) => {

    try {
        const userData = await User.findById({ _id: req.query.id })

        res.render('edit-Profile', { user: userData })
    } catch (error) {
        console.log(error.message)
    }
}

const updateUserDeatails = async (req, res) => {
    try {
        const userData = await User.findByIdAndUpdate({ _id: req.body.user_id }, { $set: { name: req.body.name, email: req.body.email } })
        const address = {
            name: req.body.addressname,
            pincode:req.body.pin,
            landmark: req.body.landmark,
            address : req.body.address,
            mobile:req.body.mobile
        }
       // console.log(address);
        if(address){
            const userData = await User.findByIdAndUpdate({ _id: req.body.user_id }, { $set: { address : address}  } )
        }
        if (userData) {
            res.redirect('/profile')
        } else {
            res.sendstatus(400)
        }
    } catch (error) {
        console.log(error.message)
    }
}

const loadAddress = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.query.id })
        res.render('address-section', { user })
    } catch (error) {

    }
}
const loadAddNewAddress = async (req, res) => {

    try {
        const userData = await User.findById({ _id: req.query.id })
        res.render('add-address', { user: userData })
    } catch (error) {
        console.log(error.message)
    }
}

const updateNewAdress = async (req, res) => {

    try {
        const address = {
            name: req.body.name,
            pincode: req.body.pincode,
            landmark: req.body.landmark,
            address: req.body.address,
            mobile: req.body.phone
        }
        const userData = await User.findByIdAndUpdate(
            { _id: req.query.id },
            {
                $push: {
                    address: {
                        ...address
                    }
                }
            })
        if (userData) {
            res.redirect('/profile')
        } else {
            res.sendStatus(404)
        }
    } catch (error) {
        console.log(error.message)
    }
}

//user logout
const userLogout = async (req, res) => {

    try {
        req.session.destroy()
        res.redirect('/login')
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {

    loadSignup,
    sendRegisterOtp,
    loadEnterOtp,
    verifyOtpAndSave,
    loadLogin,
    verifyLogin,
    forgetLoad,
    forgetVerify,
    resetPasswordLoad,
    resetPassword,
    loadLoginWithOtp,
    otpGeneration,
    otpVerification,
    loadProfile,
    loadEditProfilePage,
    updateUserDeatails,
    loadAddress,
    loadAddNewAddress,
    updateNewAdress,
    userLogout,
}