"use client"

import { useState, useEffect, useRef } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Animated, Image, Dimensions } from "react-native"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "../../src/config/firebaseConfig"
import { useRouter } from "expo-router"
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const IndexScreen = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const handleButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập email và mật khẩu")
      return
    }

    if (!isLogin && !fullName) {
      Alert.alert("Lỗi", "Vui lòng nhập họ và tên")
      return
    }

    setLoading(true)
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password)
        Alert.alert("Thành công", "Đăng nhập thành công!")
        router.replace("../screens/Home/home")
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          fullName: fullName,
          uid: user.uid,
          createdAt: new Date().toISOString(),
        })

        Alert.alert("Thành công", "Đăng ký thành công!")
        setIsLogin(true)
      }
    } catch (error: any) {
      console.error("Lỗi:", error)
      Alert.alert("Lỗi", error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2C3E50', '#3498DB', '#1ABC9C']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          <Text style={styles.title}>{isLogin ? "Đăng Nhập" : "Đăng Ký"}</Text>

          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Họ và tên</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#2C3E50" style={styles.inputIcon} />
                <TextInput
                  placeholder="Nhập họ và tên của bạn"
                  value={fullName}
                  onChangeText={setFullName}
                  style={styles.input}
                  autoCapitalize="words"
                  placeholderTextColor="#95A5A6"
                />
              </View>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#2C3E50" style={styles.inputIcon} />
              <TextInput
                placeholder="Nhập email của bạn"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#95A5A6"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mật khẩu</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#2C3E50" style={styles.inputIcon} />
              <TextInput
                placeholder="Nhập mật khẩu của bạn"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={styles.input}
                placeholderTextColor="#95A5A6"
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="#2C3E50" 
                />
              </TouchableOpacity>
            </View>
          </View>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]} 
              onPress={handleAuth} 
              disabled={loading}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{isLogin ? "Đăng nhập" : "Đăng ký"}</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/(auth)/register")}
          >
            <Text style={styles.loginButtonText}>Chưa có tài khoản? Đăng ký</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.registerButton, { marginTop: 10 }]}
            onPress={() => router.push("/(auth)/CreateOrganization")}
          >
            <Text style={styles.registerButtonText}>Tạo tổ chức</Text>
          </TouchableOpacity>

          {isLogin && (
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => router.push("./ForgotPassword")}
              disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: width * 0.9,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#2C3E50",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "500",
    color: "#2C3E50",
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#2C3E50',
  },
  eyeIcon: {
    padding: 10,
  },
  button: {
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
  },
  primaryButton: {
    backgroundColor: "#1ABC9C",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: "transparent",
    padding: 10,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#1ABC9C",
    fontSize: 16,
    fontWeight: "600",
  },
  registerButton: {
    backgroundColor: "transparent",
    padding: 10,
    alignItems: "center",
  },
  registerButtonText: {
    color: "#1ABC9C",
    fontSize: 16,
    fontWeight: "600",
  },
  forgotPasswordButton: {
    alignItems: "center",
    padding: 10,
  },
  forgotPasswordText: {
    color: "#1ABC9C",
    fontSize: 16,
    textDecorationLine: "underline",
  },
})

export default IndexScreen

