const { ObjectID, ObjectId } = require("mongodb");
const { usersCollection } = require("../../config/database/db");
const { Timekoto } = require("timekoto");
const bcrypt = require("bcrypt");

class UserModel {
  constructor(id, fullName, email, password) {
    this._id = id;
    this.fullName = fullName;
    this.email = email;
    this.password = password;
  }

  //find by email
  static async findByEmail(email) {
    const user = await usersCollection.findOne({ email: email });
    return user;
  }

  //find by id
  static async findById(id) {
    console.log(id);
    const user = await usersCollection.findOne({ _id: ObjectID(id) });
    return user;
  }

  //create
  static async createUser({ email, password }) {
    const newUser = {
      email,
      password,
      createdAt: Timekoto(),
    };
    const result = await usersCollection.insertOne(newUser);
    const createdUser = {
      _id: result.insertedId,
      ...newUser,
    };
    return createdUser;
  }

  //get all
  static async getAllUsers() {
    const users = await usersCollection.find().toArray();
    return users;
  }

  //get one user
  static async getOneUser(userId) {
    const query = { _id: new ObjectId(userId) };
    const user = await usersCollection.findOne(query);
    return user;
  }

  //update user data
  static async updateUser(id, updates) {
    const updatedUser = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnOriginal: false }
    );
    return updatedUser;
  }

  //update password by email
  static async updateUserPassword(email, updates) {
    const updatedUser = await usersCollection.findOneAndUpdate(
      { email: email },
      { $set: updates },
      { returnOriginal: false }
    );
    return updatedUser;
  }

  //update password by old password
  static async updateUserPassword(email, oldPassword, newPassword) {
    const user = await usersCollection.findOne({ email: email });
    if (!user) {
      return "user not found";
    }
    const isMatch = await bcrypt.compare(oldPassword, user?.password);
    if (!isMatch) {
      return "password does not match";
    }
    const password = await bcrypt.hash(newPassword, 10);
    const updates = { password };
    const updatedUser = await usersCollection.findOneAndUpdate(
      { email: email },
      { $set: updates },
      { returnOriginal: false }
    );
    if (!updatedUser) {
      return "user not found";
    }
    console.log("password updated successfully!");
    return "password updated successfully!";
  }

  //delete
  static async deleteUser(id) {
    const deletedUser = await usersCollection.deleteOne({
      _id: new ObjectId(id),
    });
    return deletedUser;
  }
}

module.exports = UserModel;
