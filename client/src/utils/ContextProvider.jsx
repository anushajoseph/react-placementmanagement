import React, { createContext, useState, useEffect } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "./Firebase";
import { message } from "antd";

export const Context = createContext(null);

const ContextProvider = ({ children }) => {
  const [isCollapsed, setCollapsed] = useState(false);

  const [unRegisteredGoogleUser, setUnRegisteredGoogleUser] = useState(null);
  const [registeredGoogleUser, setRegisteredGoogleUser] = useState(null);

  const checkUser = async (signedInUser) => {
    try {
      const response = await fetch("http://localhost:3000/api/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userid: parseInt(signedInUser.displayName.substring(0, 8)),
        }),
      });
      const data = await response.json();

      if (data === "unregistered") {
        // console.log(data);
        setUnRegisteredGoogleUser(signedInUser);
      } else if (data === "registered") {
        // console.log(data);
        setRegisteredGoogleUser(signedInUser);
      }

      // Calculate the timestamp for 5 days from now
      const fiveDaysLater = new Date();
      oneDayLater.setDate(fiveDaysLater.getDate() + 1);

      // Store the sign-in timestamp in local storage
      localStorage.setItem(
        "googleSignInTime",
        fiveDaysLater.getTime().toString()
      );
    } catch (error) {
      googleSignOut(); // signing out is necessary response is not obtained. If we didnt write this function, even though the page is protected and not shown, the user details are stil existing
      console.error(error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (signedInUser) => {
      if (signedInUser) {
        checkUser(signedInUser); // this function sends the signedInUser object from firebase to the backend and checks whether the user is registered or not.
      } else {
        setUnRegisteredGoogleUser(null);
        setRegisteredGoogleUser(null);
      }
    });

    // Check if the user is signed in even when offline
    const storedSignInTime = localStorage.getItem("googleSignInTime");
    if (storedSignInTime) {
      const currentTime = new Date().getTime();
      if (currentTime >= parseInt(storedSignInTime)) {
        signOut(auth); // Sign out the user if 5 days have passed
        localStorage.removeItem("googleSignInTime"); // Remove the stored sign-in time
      }
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const [admin, setAdmin] = useState(() => {
    // Load admin from localStorage upon refresh if it exists and hasn't expired
    const adminJson = sessionStorage.getItem("browseradmin");
    if (adminJson) {
      const { data, expiry } = JSON.parse(adminJson);
      if (expiry > Date.now()) {
        return data;
      }
    }
    return null;
  });

  // Save admin to localStorage when it changes
  useEffect(() => {
    if (admin) {
      const expiry = Date.now() + 1000 * 60 * 10; // expires in 10 minutes
      sessionStorage.setItem(
        "browseradmin",
        JSON.stringify({ data: admin, expiry })
      );
    } else {
      sessionStorage.removeItem("browseradmin");
    }
  }, [admin]);

  const login = async (adminobj) => {
    try {
      if (adminobj) {
        const response = await fetch("http://localhost:3000/api/admin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(adminobj),
        });
        const data = await response.json();
        if (response.status === 200) {
          message.success(data);
          setAdmin(adminobj);
        } else {
          message.error(data);
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const logout = () => {
    setAdmin(null);
  };

  const googleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
        hd: "jecc.ac.in",
      });

      await signInWithPopup(auth, provider);
    } catch (error) {
      console.log(error);
    }
  };

  const googleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("googleSignInTime");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Context.Provider
      value={{
        admin,
        login,
        logout,
        googleSignIn,
        googleSignOut,
        unRegisteredGoogleUser,
        registeredGoogleUser,
        isCollapsed,
        setCollapsed,
      }}
    >
      {children}
    </Context.Provider>
  );
};

export default ContextProvider;
