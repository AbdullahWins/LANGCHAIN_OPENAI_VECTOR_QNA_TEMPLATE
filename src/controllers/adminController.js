// controllers/adminController.js

const { ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const { adminsCollection } = require("../../config/database/db");
const AdminModel = require("../models/AdminModel");
const { SendEmail } = require("../services/email/SendEmail");
const { uploadMultipleFiles } = require("../utilities/fileUploader");
const { InitiateToken } = require("../services/token/InitiateToken");

// login
const LoginAdmin = async (req, res) => {
  try {
    const data = JSON.parse(req?.body?.data);
    const { email, password } = data;
    const admin = await AdminModel.findByEmail(email);
    console.log(admin);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    const passwordMatch = await bcrypt.compare(password, admin?.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }
    const token = InitiateToken(admin?._id, 30);
    res.json({ token, admin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// registration
const RegisterAdmin = async (req, res) => {
  try {
    const data = JSON.parse(req?.body?.data);
    const { email, password } = data;
    const existingAdminCheck = await AdminModel.findByEmail(email);
    if (existingAdminCheck) {
      return res.status(409).json({ message: "Admin already exists" });
    }
    // create a new Admin
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await AdminModel.createAdmin({
      email,
      password: hashedPassword,
    });
    res.status(201).json(newAdmin);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// get all Admin
const getAllAdmins = async (req, res) => {
  try {
    //get admin directly
    // const query = {};
    // const cursor = adminsCollection.find(query);
    // const admins = await cursor.toArray();

    //get admin using model
    const admins = await AdminModel.getAllAdmins();

    console.log(`Found ${admins.length} admins`);
    res.send(admins);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server Error" });
  }
};

// get Admin by types
const getAdminsByType = async (req, res) => {
  try {
    const adminTypeName = req.params.typeName;
    const admins = await adminsCollection
      .find({ adminType: adminTypeName })
      .toArray();
    if (admins.length === 0) {
      res
        .status(404)
        .send({ message: "No admins found for the specified type" });
    } else {
      res.send(admins);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server Error" });
  }
};

// get single Admin
const getOneAdmin = async (req, res) => {
  try {
    const adminId = req.params.id;
    //object id validation
    if (!ObjectId.isValid(adminId)) {
      console.log("Invalid ObjectId:", adminId);
      return res.status(400).send({ message: "Invalid ObjectId" });
    }
    const admin = await adminsCollection.findOne({
      _id: new ObjectId(adminId),
    });
    if (!admin) {
      res.status(404).send({ message: "admin not found" });
    } else {
      console.log(admin);
      res.send(admin);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server Error" });
  }
};

// update one Admin
const updateAdminById = async (req, res) => {
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
    const folderName = "admins";
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
    // const result = await adminsCollection.updateOne(query, {
    //   $set: updateData,
    // });

    //update using model
    const result = await AdminModel.updateAdmin(id, updateData);

    if (result?.modifiedCount === 0) {
      console.log("No modifications were made:", id);
      res.status(404).send({ message: "No modifications were made!" });
    } else {
      console.log("admin updated:", id);
      res.send(updateData);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to update admin" });
  }
};

// send password reset link to admin
const sendPasswordResetLink = async (req, res) => {
  try {
    const data = JSON.parse(req?.body?.data);
    const { email } = data;
    if (email) {
      const query = { email: email };
      const result = await adminsCollection.findOne(query);
      const receiver = result?.email;
      if (!receiver) {
        return res.status(401).send({ message: "admin doesn't exists" });
      } else {
        const subject = "Reset Your Password";
        const text = `Please follow this link to reset your password: ${process.env.ADMIN_PASSWORD_RESET_URL}/${receiver}`;
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
    res.status(500).send({ message: "Failed to reset admin password" });
  }
};

// update one Admin password by email
const updateAdminPasswordByEmail = async (req, res) => {
  try {
    const data = JSON.parse(req?.body?.data);
    const { email, newPassword } = data;
    let updateData = {};
    if (email && newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateData = { password: hashedPassword };
    }
    const query = { email: email };
    const result = await adminsCollection.updateOne(query, {
      $set: updateData,
    });
    if (result?.modifiedCount === 0) {
      console.log("No modifications were made:", email);
      res.status(404).send({ message: "No modifications were made!" });
    } else {
      console.log("password updated for:", email);
      res.send({ message: "password updated successfully!" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to reset admin password" });
  }
};

// update one admin password by OldPassword
const updateAdminPasswordByOldPassword = async (req, res) => {
  try {
    const email = req?.params?.email;
    console.log(email);
    const query = { email: email };
    const data = JSON.parse(req?.body?.data);
    const admin = await AdminModel.findByEmail(email);

    const { oldPassword, newPassword } = data;
    let updateData = {};

    if (!admin) {
      return res.status(404).json({ message: "admin not found" });
    }
    const passwordMatch = await bcrypt.compare(oldPassword, admin?.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: "invalid password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    updateData = { password: hashedPassword };
    const result = await adminsCollection.updateOne(query, {
      $set: updateData,
    });
    if (result?.modifiedCount === 0) {
      res.status(404).send({ message: "Admin doesn't exists!" });
    }
    console.log("password updated for:", email);
    res.send({ message: "Password has been changed!" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to update admin password" });
  }
};

// delete one Admin
const deleteAdminById = async (req, res) => {
  try {
    const id = req.params.id;
    //object id validation
    if (!ObjectId.isValid(id)) {
      console.log("Invalid ObjectId:", id);
      return res.status(400).send({ message: "Invalid ObjectId" });
    }

    //delete directly
    // const query = { _id: new ObjectId(id) };
    // const result = await adminsCollection.deleteOne(query);

    //delete using model
    const result = await AdminModel.deleteAdmin(id);
    if (result?.deletedCount === 0) {
      console.log("no admin found with this id:", id);
      res.send("no admin found with this id!");
    } else {
      console.log("admin deleted:", id);
      res.send({ message: "admin deleted successfully with id: " + id });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to delete admin" });
  }
};

module.exports = {
  getOneAdmin,
  getAdminsByType,
  getAllAdmins,
  updateAdminById,
  sendPasswordResetLink,
  updateAdminPasswordByEmail,
  RegisterAdmin,
  LoginAdmin,
  updateAdminPasswordByOldPassword,
  deleteAdminById,
};
