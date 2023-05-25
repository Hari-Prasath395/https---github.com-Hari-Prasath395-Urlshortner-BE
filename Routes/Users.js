const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const path = require('path');
const UserModel = require("../Models/Users");
const PasswordResetModel = require("./../Models/PasswordReset");
const userVerificationModel = require("../Models/UserVerification");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  } else {
    console.log("Ready to message");
    console.log(success);
  }
});

// Signup route for the user
router.post("/signupuser", async (req, res) => {
  const { name, email, password, dateOfBirth } = req.body;

  // Check the input fields for empty
  if (name == "" || email == "" || password == "" || dateOfBirth == "") {
    res.json({
      status: "Failed",
      message: "Empty input fields!",
    });
  } else if (!/^[a-zA-Z]*$/.test(name)) {
    res.json({
      status: "Failed",
      message: "Invalid name entered",
    });
  } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    res.json({
      status: "Failed",
      message: "Invalid email entered",
    });
  } else if (!new Date(dateOfBirth).getTime()) {
    res.json({
      status: "Failed",
      message: "Invalid Date of birth entered",
    });
  } else if (password.length < 8) {
    res.json({
      status: "Failed",
      message: "Password is too short",
    });
  } else {
    try {
      const result = await UserModel.find({ email });
      if (result.length) {
        res.json({
          status: "Failed",
          message: "User with the email already exists",
        });
      } else {
        const saltRounds = 10;
        try {
          const hashedPassword = await bcrypt.hash(password, saltRounds);
          const newUser = new UserModel({
            name,
            email,
            password: hashedPassword,
            dateOfBirth,
            verified: false,
          });

          const savedUser = await newUser.save();
          //handle account verification
          sendVerificationEmail(savedUser, res);
        } catch (err) {
          res.json({
            status: "Failed",
            message: "An error occurred while saving the user account!",
          });
        }
      }
    } catch (err) {
      console.log(err);
      res.json({
        status: "Failed",
        message: "Error occurred while checking for existing user",
      });
    }
  }
});
const sendVerificationEmail = ({ _id, email }, res) => {
  const currentUrl = "http://localhost:8000/";
  const uniqueString = uuidv4() + _id;

  const mailOptions = {
    from: process.env.AUTH_EMAIL,
    to: email,
    subject: "Verify Your Email",
    html: `<p>Verify your email address to complete the 
          signup and log into your account</p>.<p>This link <b>expires in 6 hours</b></p>.
          <p>Press <a href=${
            currentUrl + "user/verify/" + _id + "/" + uniqueString
          }>here<a/>to proceed</p>`,
  };

  // Hash the unique string
  const saltRounds = 10;
  bcrypt
    .hash(uniqueString, saltRounds)
    .then((hashedUniqueString) => {
      const newVerification = new userVerificationModel({
        userId: _id,
        uniqueString: hashedUniqueString, // Store the hashed unique string
        createdAt: Date.now(),
        expiresAt: Date.now() + 21600000,
      });

      newVerification
        .save()
        .then(() => {
          transporter
            .sendMail(mailOptions)
            .then(() => {
              // Update the 'verified' field in the user document
              UserModel.findByIdAndUpdate(
                _id,
                { verified: false },
                { new: true }
              )
                .then((updatedUser) => {
                  res.json({
                    status: "Pending",
                    message: "Verification email sent",
                  });
                })
                .catch((err) => {
                  res.json({
                    status: "Failed",
                    message:
                      "Failed to update the 'verified' field in the database",
                  });
                });
            })
            .catch((err) => {
              res.json({
                status: "Failed",
                message: "Verification email failed",
              });
            });
        })
        .catch((err) => {
          console.log(err);
          res.json({
            status: "Failed",
            message: "Can't able to save verification email data!",
          });
        });
    })
    .catch((err) => {
      res.json({
        status: "Failed",
        message: "Error occurred while hashing email data!",
      });
    });
};


router.get('/verify/:userId/:uniqueString', async (req, res) => {
  const { userId, uniqueString } = req.params;

  try {
    const verificationResult = await userVerificationModel.findOne({ userId });

    if (verificationResult) {
      const { expiresAt, uniqueString: hashedUniqueString } = verificationResult;

      if (expiresAt < Date.now()) {
        // Record expired, delete it and the associated user
        await userVerificationModel.deleteOne({ userId });
        await UserModel.deleteOne({ _id: userId });

        const message = "Link expired. Please sign up again";
        res.redirect(`/user/verified?err=true&message=${message}`);
      } else {
        // Valid record exists, so we validate the unique string
        const isUniqueStringValid = await bcrypt.compare(
          uniqueString,
          hashedUniqueString
        );

        if (isUniqueStringValid) {
          await UserModel.updateOne({ _id: userId }, { verified: true });
          await userVerificationModel.deleteOne({ userId });

          // User successfully verified
          const message = "Verified successfully";
          res.redirect(`/user/verified?message=${message}`);
        } else {
          const message = "Invalid verification details passed. Check your inbox";
          res.redirect(`/user/verified?err=true&message=${message}`);
        }
      }
    } else {
      // User verification record doesn't exist or has been verified already
      const message =
        "Account record doesn't exist or has been verified already. Please sign up or login";
      res.redirect(`/user/verified?err=true&message=${message}`);
    }
  } catch (err) {
    console.log(err);
    const message =
      "An error occurred while checking for existing user verification record";
    res.redirect(`/user/verified?err=true&message=${message}`);
  }
});




router.get('/verified', (req, res) => {
  
  res.sendFile(path.join(__dirname,"./../views/verified.html"))
});

router.post("/signin", (req, res) => {
  const { email, password } = req.body;

  if (email == "" || password == "") {
    res.json({
      status: "Failed",
      message: "Empty credentials provided",
    });
  } else {
    UserModel.find({ email })
      .then((data) => {
        if (data.length) {
          if (!data[0].verified) {
            res.json({
              status: "Failed",
              message: "Email hasn't been verified yet. Check your inbox",
            });
          } else {
            const hashedPassword = data[0].password;
            bcrypt
              .compare(password, hashedPassword)
              .then((result) => {
                if (result) {
                  res.json({
                    status: "Success",
                    message: "Signin successful!",
                    data: data[0],
                  });
                } else {
                  res.json({
                    status: "Failed",
                    message: "Invalid password entered!",
                  });
                }
              })
              .catch((err) => {
                res.json({
                  status: "Failed",
                  message: "An error occurred while comparing passwords",
                });
              });
          }
        } else {
          res.json({
            status: "Failed",
            message: "Invalid credentials entered!",
          });
        }
      })
      .catch((err) => {
        res.json({
          status: "Failed",
          message: "An error occurred while checking the existing user",
        });
      });
  }
});


router.post("/resetPassword", (req, res) => {
  let { userId, resetString, newPassword } = req.body;

  PasswordResetModel.find({ userId })
    .then((result) => {
      if (result.length>0) {
        // Password reset record exists
        const { expiresAt } = result[0];
        const hashedResetString =result[0].resetString;

        // Checking for expired resetString
        if (expiresAt < Date.now()) {
          // Reset link has expired, delete the reset record
          PasswordResetModel.deleteOne({ userId })
            .then(() => {
              res.json({
                status: "Failed",
                message: "Password reset link has expired",
              });
            })
            .catch((error) => {
              console.log(error);
              res.json({
                status: "Failed",
                message: "Clearing password reset record failed",
              });
            });
        } else {
          // Valid reset record exists, so validate the reset string
          // Compare the hashed reset string

          console.log('Comparing resetString:', resetString);
          console.log('Hashed resetString:', hashedResetString);
          bcrypt
            .compare(resetString, hashedResetString)
            .then((result) => {
              if (result) {
                // Reset string matched, hash the new password
                const saltRounds = 10;
                bcrypt
                  .hash(newPassword, saltRounds)
                  .then((hashedNewPassword) => {
                    // Update user password in the user model
                    UserModel.updateOne(
                      { _id: userId },
                      { password: hashedNewPassword }
                    )
                      .then(() => {
                        // Update complete, now delete the reset record
                        PasswordResetModel.deleteOne({ userId })
                          .then(() => {
                            res.json({
                              status: "success",
                              message: "Password reset successfully",
                            });
                          })
                          .catch((error) => {
                            console.log(error);
                            res.json({
                              status: "Failed",
                              message:
                                "An error occurred while finalizing password reset",
                            });
                          });
                      })
                      .catch((error) => {
                        console.log(error);
                        res.json({
                          status: "Failed",
                          message: "Updating user password failed",
                        });
                      });
                  })
                  .catch((error) => {
                    console.log(error);
                    res.json({
                      status: "Failed",
                      message:
                        "An error occurred while hashing the new password",
                    });
                  });
              } else {
                // Existing record, but incorrect reset string passed
                res.json({
                  status: "Failed",
                  message: "Invalid password reset details passed",
                });
              }
            })
            .catch((error) => {
              console.log(error);
              res.json({
                status: "Failed",
                message: "Comparing password reset strings failed",
              });
            });
        }
      } else {
        // Password reset record doesn't exist
        res.json({
          status: "Failed",
          message: "Password reset request not found",
        });
      }
    })
    .catch((error) => {
      console.log(error);
      res.json({
        status: "Failed",
        message: "Checking for existing password reset record failed!",
      });
    });
});

router.post('/requestpasswordreset', (req, res) => {
  const { email, redirectUrl } = req.body;

  // Check if the email exists in the database
  UserModel.find({ email })
    .then((data) => {
      if (data.length) {
        if (!data[0].verified) {
          res.json({
            status: 'Failed',
            message: "Email hasn't been verified yet. Check your inbox.",
          });
        } else {
          // Proceed with sending the password reset email
          sendResetEmail(data[0], redirectUrl, res);
        }
      } else {
        res.json({
          status: 'Failed',
          message: 'No account with the provided email exists!',
        });
      }
    })
    .catch((error) => {
      console.log(error);
      res.json({
        status: 'Failed',
        message: 'An error occurred while checking the existing user',
      });
    });
});

const sendResetEmail = ({ _id, email }, redirectUrl, res) => {
  const resetString = uuidv4() + _id;
  // Clear all existing reset records
  PasswordResetModel.deleteMany({ userId: _id })
    .then(() => {
      // Reset records deleted successfully
      const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: 'Password Reset Mail',
        html: `<p>The lost password can be reset.</p>
               <p>This link <b>expires in 60 minutes</b>.</p>
               <p>Press <a href="${redirectUrl}/${_id}/${resetString}">here</a> to proceed.</p>`,
      };

      // Hash the reset string
      const saltRounds = 10;
      bcrypt
        .hash(resetString, saltRounds)
        .then((hashedResetString) => {
          // Set the values in the password reset collection
          const newPasswordReset = new PasswordResetModel({
            userId: _id,
            resetString:
            hashedResetString,
            createdAt: Date.now(),
            expiresAt: Date.now() + 60 * 60 * 1000, // Set expiration time to 60 minutes from now
          });
          newPasswordReset
            .save()
            .then(() => {
              transporter
                .sendMail(mailOptions)
                .then(() => {
                  // Reset email sent successfully
                  res.json({
                    status: 'Pending',
                    message: 'Password reset email sent successfully',
                  });
                })
                .catch((error) => {
                  console.log(error);
                  res.json({
                    status: 'Failed',
                    message: 'Password reset email failed',
                  });
                });
            })
            .catch((error) => {
              console.log(error);
              res.json({
                status: 'Failed',
                message: "Couldn't save password reset data",
              });
            });
        })
        .catch((error) => {
          console.log(error);
          res.json({
            status: 'Failed',
            message: 'An error occurred while hashing the password reset data',
          });
        });
    })
    .catch((error) => {
      // Error while clearing existing records
      console.log(error);
      res.status(500).json({
        status: 'Failed',
        message: 'Clearing existing password reset records failed',
      });
    });
};










module.exports = router;
