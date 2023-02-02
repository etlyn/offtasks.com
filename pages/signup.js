import { useState } from "react";
import { supabaseClient } from "../backend";
import { useRouter } from "next/router";
import { LogoXL } from "../icons";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const router = useRouter();

  const [isSubmitted, setIsSubmitted] = useState(false);

  const submitHandler = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (password === password2) {
        const { error } = await supabaseClient.auth.signUp({
          email,
          password,
        });

        if (error) {
          alert("Error create account", error);
          setError(error.message);
        } else {
          // alert(`Please check your ${email} to confirm your account`, error);
          router.push("/login");
          setIsSubmitted(true);
        }
      } else {
        alert("passwords doesn't match, please try again");
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const changeHandlerEmail = (event) => {
    setEmail(event.target.value);
  };

  const changeHandlerPassword = (event) => {
    setPassword(event.target.value);
  };

  const changeHandlerPassword2 = (event) => {
    setPassword2(event.target.value);
  };

  const handleLogIn = () => {
    router.push("/login");
  };

  return (
    <div className=" bg-zinc-900 flex flex-1 h-screen items-center">
      <div className="bg-zinc-800 h-3/4 md:w-3/5 w-full container  rounded-lg">
        <div className="container flex justify-center items-center mt-12">
          <LogoXL />
        </div>
        <div className="container flex flex-col justify-center items-center mt-12 md:w-2/6 w-3/4">
          <h1 className="text-zinc-50 text-xl font-bold">Create Account</h1>

          <h1 className="text-zinc-50 mt-4 self-start mb-2 font-medium text-sm">
            Email
          </h1>
          <input
            type="email"
            className="border-zinc-100  border  bg-transparent rounded-md h-12 w-full px-4 text-zinc-50"
            onChange={changeHandlerEmail}
            required=""
            disabled={isLoading}
          />

          <h1 className="text-zinc-50 mt-4 self-start mb-2 font-medium text-sm">
            Create Password
          </h1>
          <input
            onChange={changeHandlerPassword}
            className="border-zinc-100  border  bg-transparent rounded-md h-12 w-full px-4 text-zinc-50"
            type="password"
            required=""
            disabled={isLoading}
          />

          <h1 className="text-zinc-50 mt-4 self-start mb-2 font-medium text-sm">
            Repeat Password
          </h1>
          <input
            onChange={changeHandlerPassword2}
            className="border-zinc-100  border  bg-transparent rounded-md h-12 w-full px-4 text-zinc-50"
            type="password"
            required=""
            disabled={isLoading}
          />

          <button
            className=" bg-cyan-600 mt-8 w-full h-12 rounded-lg"
            onClick={submitHandler}
          >
            <h1 className="text-zinc-50 text-sm  font-light">Create Account</h1>
          </button>

          <div
            className="mt-6 flex flex-row w-full text-zinc-50  justify-center cursor-pointer"
            onClick={handleLogIn}
          >
            <h1 className="font-light text-sm text-center">
              Already a Member?
            </h1>
            <h1 className="font-bold text-sm ml-2">Log In</h1>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
