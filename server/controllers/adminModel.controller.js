import adminModel from "../mongodb/models/adminModel.js";
import mongoose from "mongoose";
import bycrypt from "bcrypt";

const getAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    const adminObj = await adminModel.findOne({ username: username });
    if (!adminObj) {
      return res.status(401).json("Invalid username");
    }

    // compare the password with the hashed password in the database
    const isValidPassword = await bycrypt.compare(password, adminObj.password);

    if (!isValidPassword) {
      return res.status(401).json("Invalid password");
    }

    return res.status(200).json("Successfully logged in");
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }

  // try {
  //   const { username, password } = req.body;

  //   // hash the password
  //   const hashedpassword = await bycrypt.hash(password, 13);

  //   // This is the case of creating multiple admin accounts
  //   const adminExists = await adminModel.findOne({ username });
  //   if (adminExists) {
  //     return res.status(200).json(adminExists);
  //   }

  //   const newAdmin = await adminModel.create({
  //     username: username,
  //     password: hashedpassword,
  //   });
  //   return res.status(200).json("Successfully created admin");
  // } catch (error) {
  //   return res.status(500).json({ message: error.message });
  // }
};

const getUpdateAdmin = async (req, res) => {
  try {
    const adminObj = await adminModel.findOne({});
    // only username is send to frontend
    const filteredAdminObj = { username: adminObj.username };
    return res.status(200).json(filteredAdminObj);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldpassword, newpassword } = req.body;

    // Finds the admin by the id
    const adminToUpdate = await adminModel.findOne({ username: id });

    // Check if the admin exists
    if (!adminToUpdate) {
      return res.status(404).json("Admin not found");
    }

    // compare with  hashed password
    const isValidPassword = await bycrypt.compare(
      oldpassword,
      adminToUpdate.password
    );

    if (!isValidPassword) {
      return res
        .status(401)
        .json(
          "Invalid old password. Make sure not to reuse old password. Please contact the IT if forgot password"
        );
    }

    // start a new session for atomicity property
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // hash the password
      const hashedpassword = await bycrypt.hash(newpassword, 13);

      await adminModel
        .findOneAndUpdate(
          { username: id }, // id to update
          { password: hashedpassword } // fields to be patched
        )
        .session(session);
      await session.commitTransaction();
      return res.status(200).json("Password updated");
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export { getAdmin, getUpdateAdmin, updateAdmin };
