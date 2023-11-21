const { ObjectID, ObjectId } = require("mongodb");
const { adminsCollection } = require("../../config/database/db");
const { Timekoto } = require("timekoto");

class AdminModel {
  constructor(id, fullName, email, password) {
    this._id = id;
    this.fullName = fullName;
    this.email = email;
    this.password = password;
  }

  static async findByEmail(email) {
    const admin = await adminsCollection.findOne({ email: email });
    return admin;
  }

  static async findById(id) {
    console.log(id);
    const admin = await adminsCollection.findOne({ _id: ObjectID(id) });
    return admin;
  }

  //create
  static async createAdmin({ email, password }) {
    const newAdmin = {
      email,
      password,
      createdAt: Timekoto(),
    };
    const result = await adminsCollection.insertOne(newAdmin);
    const createdAdmin = {
      _id: result.insertedId,
      ...newAdmin,
    };
    return createdAdmin;
  }

  //get all
  static async getAllAdmins() {
    const admins = await adminsCollection.find().toArray();
    return admins;
  }

  //update
  static async updateAdmin(id, updates) {
    const updatedAdmin = await adminsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnOriginal: false }
    );
    return updatedAdmin;
  }

  //delete
  static async deleteAdmin(id) {
    const deletedAdmin = await adminsCollection.deleteOne({
      _id: new ObjectId(id),
    });
    return deletedAdmin;
  }
}

module.exports = AdminModel;
