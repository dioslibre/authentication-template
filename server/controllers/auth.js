const User = require("../models/user");
const jwt = require('jsonwebtoken');
//Bring in sendgrid
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// exports.signup = async (req, res, next) => {
//   try {
//     const user = await User.findOne({ email: req.email });
//     if (user) {
//       return res.status(400).json({
//         msg: "The user with this email address already exists"
//       });
//     }
//     let newUser = new User({name, email, password});

//     newUser.save((err, success) => {
//         if(err) {
//             console.log('SignUp Error', err)
//             return res.status(400).json({
//                 msg: 'There was a problem signing you up'
//             })
//         }
//     });

//     return res.status(200).json({
//         msg: 'The user was successfully created',
//         data: newUser
//     })
//   } catch (err) {
//     console.error(err.message);
//     return res.status(500).json({
//       msg: "Internal Server Error"
//     });
//   }
// };

exports.signup = async (req, res, next) => {
  const { name, email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user){
        return res.status(400).json({
            msg: 'User with this email address already exists'
        })
    }

    const token = jwt.sign({name, email, password}, process.env.JWT_ACCOUNT_ACTIVATION, {
        expiresIn: '10m'
    })

    const emailData = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: `Account activation link`,
        html: `
            <h1>Please use the following link to activate your account</h1>
            <p>${process.env.CLIENT_URL}/auth/activate/${token}</p>
            <hr />
            <p>This email may contain sensitve information</p>
            <p>${process.env.CLIENT_URL}</p>
        `
    }

    const sent = await sgMail.send(emailData);
    res.status(200).json({
        msg: 'The email was successfully sent',
        data: sent
    })
  } catch (err) {
    console.error(err.message);
    return res.status(400).json({
      msg: "Internal Server Error"
    });
  }
};

exports.accountActivation = (req, res, next) => {
    const {token} = req.body;

    if(token) {
        jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION, function(err, decoded) {
            if(err) {
                return res.status(400).json({
                    msg: 'expired Link. Signup again'
                })
            }
            const {name, email, password} = jwt.decode(token);
            console.log(decoded);
            const user = new User({name, email, password});
            user.save((err, user) => {
                if(err) {
                    return res.status(401).json({
                        msg: 'Error saving user in the database. Try signing up again'
                    })
                }
                return res.status(200).json({
                    msg: 'User Registered Successfully',
                    user: user
                })
            })
        })
    } else {
        return res.json({
            msg: 'Something went wrong. Try Again'
        })
    }
}

exports.signin = async (req, res, next) => {
    const {email, password} = req.body;
    try {
        const user = await User.findOne({email})
        const isAuth = user.authenticate(password);
        if(!isAuth){
            return res.status(400).json({
                msg: 'Either the password or the email address is invalid. Please try again'
            })
        }
        const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET, {
            expiresIn: '7d'
        })
        const {_id, role, name} = user;
        return res.status(200).json({
            msg: 'Login was done successfully',
            token,
            user: {_id, role, name, email}
        })
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({
            msg: 'Internal Server Error. Please try again'
        })
    }
    
}
