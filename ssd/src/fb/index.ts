// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyAO7qHfl40331dVJr8SAockCw1SemO8KFk',
  authDomain: 'doe-ssd.firebaseapp.com',
  projectId: 'doe-ssd',
  storageBucket: 'doe-ssd.appspot.com',
  messagingSenderId: '270169291994',
  appId: '1:270169291994:web:26c4a4798f9c675afbf9e3',
}

// Initialize Firebase
export const fbApp = initializeApp(firebaseConfig)
