import supabase from "./supabase";
import {supabaseUrl} from "./supabase";



// REGISTER
export const registerUser = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

// LOGIN
export const loginUser = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

// LOGOUT
export const logoutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// CURRENT USER
export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user;
};
