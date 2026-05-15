"use client";

import { initializeApp, getApp, getApps } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { get, getDatabase, ref, update } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";

export const firebaseConfig = {
  apiKey: "AIzaSyCUHW7BfQCqmDwGKGpxXSXOSR55xnPUP-A",
  authDomain: "caretrack-badc5.firebaseapp.com",
  databaseURL: "https://caretrack-badc5-default-rtdb.firebaseio.com",
  projectId: "caretrack-badc5",
  storageBucket: "caretrack-badc5.firebasestorage.app",
  messagingSenderId: "649164871928",
  appId: "1:649164871928:web:5c399dbe6f803a5dd3030d",
  measurementId: "G-XV9DSFSYCQ",
};

export const defaultClinicId = "default";
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const functions = getFunctions(app);

export {
  addDoc,
  browserLocalPersistence,
  browserSessionPersistence,
  collection,
  deleteDoc,
  doc,
  get,
  getDoc,
  getDocs,
  httpsCallable,
  limit,
  onAuthStateChanged,
  orderBy,
  query,
  ref,
  sendPasswordResetEmail,
  serverTimestamp,
  setDoc,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  update,
  where,
};
