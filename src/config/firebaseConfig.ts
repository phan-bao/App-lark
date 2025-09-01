
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getFunctions } from "firebase/functions"

// Cấu hình Firebase từ google-services.json
const firebaseConfig = {
  apiKey: "AIzaSyCMYRkr-1TfVqkN-MCENlf88bNNPOGTuo8",
  authDomain: "applark-20ec5.firebaseapp.com",
  projectId: "applark-20ec5",
  storageBucket: "applark-20ec5.firebasestorage.app",
  messagingSenderId: "891762236661",
  appId: "1:891762236661:android:8cfdccbc33878fb47379bc",
}

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig)
// Khởi tạo các dịch vụ Firebase
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)
const functions = getFunctions(app)
export { auth, db, storage, functions }

export default app
