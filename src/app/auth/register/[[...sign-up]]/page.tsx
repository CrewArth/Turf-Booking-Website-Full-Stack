import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <SignUp
        appearance={{
          elements: {
            formButtonPrimary: 
              "bg-green-600 hover:bg-green-700 text-sm normal-case",
            footerActionLink: "text-green-600 hover:text-green-500",
          },
        }}
        routing="path"
        path="/auth/register"
      />
    </div>
  );
} 