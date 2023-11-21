// controllers/userController.js

const { ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const { usersCollection } = require("../../config/database/db");
const UserModel = require("../models/UserModel");
const { SendEmail } = require("../services/email/SendEmail");
const { uploadMultipleFiles } = require("../utilities/fileUploader");
const { InitiateToken } = require("../services/token/InitiateToken");

// login
const LoginUser = async (req, res) => {
  try {
    const data = JSON.parse(req?.body?.data);
    const { email, password } = data;
    const user = await UserModel.findByEmail(email);
    console.log(user);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    const passwordMatch = await bcrypt.compare(password, user?.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }
    const token = InitiateToken(user?._id, 30);
    res.json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// registration
const RegisterUser = async (req, res) => {
  try {
    const data = JSON.parse(req?.body?.data);
    const { email, password } = data;
    const existingUserCheck = await UserModel.findByEmail(email);
    if (existingUserCheck) {
      return res.status(409).json({ message: "user already exists" });
    }
    // create a new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await UserModel.createUser({
      email,
      password: hashedPassword,
    });
    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// get all user
const getAllUsers = async (req, res) => {
  try {
    //get user directly
    // const query = {};
    // const cursor = usersCollection.find(query);
    // const users = await cursor.toArray();

    //get user using model
    const users = await UserModel.getAllUsers();

    console.log(`Found ${users.length} users`);
    res.send(users);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server Error" });
  }
};

// get user by types
const getUsersByType = async (req, res) => {
  try {
    const userTypeName = req.params.typeName;
    const users = await usersCollection
      .find({ userType: userTypeName })
      .toArray();
    if (users.length === 0) {
      res
        .status(404)
        .send({ message: "No users found for the specified type" });
    } else {
      res.send(users);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server Error" });
  }
};

// get single user
const getOneUser = async (req, res) => {
  try {
    const userId = req.params.id;
    //object id validation
    if (!ObjectId.isValid(userId)) {
      console.log("Invalid ObjectId:", userId);
      return res.status(400).send({ message: "Invalid ObjectId" });
    }

    //get user directly
    // const user = await usersCollection.findOne({
    //   _id: new ObjectId(userId),
    // });

    //get user using model
    const user = await UserModel.getOneUser(userId);

    if (!user) {
      res.status(404).send({ message: "user not found" });
    } else {
      console.log(user);
      res.send(user);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server Error" });
  }
};

// update one user
const updateUserById = async (req, res) => {
  try {
    const id = req.params.id;
    // Object ID validation
    if (!ObjectId.isValid(id)) {
      console.log("Invalid ObjectId:", id);
      return res.status(400).send({ message: "Invalid ObjectId" });
    }
    const { files } = req;
    const data = req.body.data ? JSON.parse(req.body.data) : {};
    const { password, ...additionalData } = data;
    const folderName = "users";
    let updateData = {};

    if (files?.length > 0) {
      const fileUrls = await uploadMultipleFiles(files, folderName);
      const fileUrl = fileUrls[0];
      updateData = { ...updateData, fileUrl };
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData = { ...updateData, password: hashedPassword };
    }

    if (Object.keys(additionalData).length > 0) {
      updateData = { ...updateData, ...additionalData };
    }

    //update directly
    // const query = { _id: new ObjectId(id) };
    // const result = await usersCollection.updateOne(query, {
    //   $set: updateData,
    // });

    //update using model
    const result = await UserModel.updateUser(id, updateData);

    if (result?.modifiedCount === 0) {
      console.log("No modifications were made:", id);
      res.status(404).send({ message: "No modifications were made!" });
    } else {
      console.log("user updated:", id);
      res.send(updateData);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to update user" });
  }
};

// send password reset link to user
const sendPasswordResetLink = async (req, res) => {
  try {
    const data = JSON.parse(req?.body?.data);
    const { email } = data;
    if (email) {
      //send link directly
      // const user = await usersCollection.findOne(query);

      //send link using model
      const user = await UserModel.findByEmail(email);
      const receiver = user?.email;
      if (!receiver) {
        return res.status(401).send({ message: "user doesn't exists" });
      } else {
        const subject = "Reset Your Password";
        const text = `Please follow this link to reset your password: ${process.env.USER_PASSWORD_RESET_URL}/${receiver}`;
        const status = await SendEmail(receiver, subject, text);
        if (!status?.code === 200) {
          return res.status(401).send({ message: "user doesn't exists" });
        }
        console.log("password reset link sent to:", receiver);
        res
          .status(200)
          .send({ message: "Password reset link sent successfully" });
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to reset user password" });
  }
};

// update one user password by email
const updateUserPasswordByEmail = async (req, res) => {
  try {
    const data = JSON.parse(req?.body?.data);
    const { email, newPassword } = data;
    let updateData = {};
    if (email && newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateData = { password: hashedPassword };
    }

    //update password directly
    // const query = { email: email };
    // const result = await usersCollection.updateOne(query, {
    //   $set: updateData,
    // });

    //update password using model
    const result = await UserModel.updateUserPassword(email, updateData);
    if (result?.modifiedCount === 0) {
      console.log("No modifications were made:", email);
      res.status(404).send({ message: "No modifications were made!" });
    } else {
      console.log("password updated for:", email);
      res.send({ message: "password updated successfully!" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to reset user password" });
  }
};

// update one user password by OldPassword
const updateUserPasswordByOldPassword = async (req, res) => {
  try {
    const email = req?.params?.email;
    const data = JSON.parse(req?.body?.data);
    const user = await UserModel.findByEmail(email);
    const { oldPassword, newPassword } = data;

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    const result = await UserModel.updateUserPassword(
      email,
      oldPassword,
      newPassword
    );
    res.send({ message: result });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to update user password" });
  }
};

// delete one user
const deleteUserById = async (req, res) => {
  try {
    const id = req.params.id;
    //object id validation
    if (!ObjectId.isValid(id)) {
      console.log("Invalid ObjectId:", id);
      return res.status(400).send({ message: "Invalid ObjectId" });
    }

    //delete directly
    // const query = { _id: new ObjectId(id) };
    // const result = await usersCollection.deleteOne(query);

    //delete using model
    const result = await UserModel.deleteUser(id);
    if (result?.deletedCount === 0) {
      console.log("no user found with this id:", id);
      res.send("no user found with this id!");
    } else {
      console.log("user deleted:", id);
      res.send({ message: "user deleted successfully with id: " + id });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to delete user" });
  }
};

module.exports = {
  getOneUser,
  getUsersByType,
  getAllUsers,
  updateUserById,
  sendPasswordResetLink,
  updateUserPasswordByEmail,
  RegisterUser,
  LoginUser,
  updateUserPasswordByOldPassword,
  deleteUserById,
};
