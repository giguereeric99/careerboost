import React from "react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Shield, LogIn, UserPlus } from "lucide-react";

const AuthRequiredState: React.FC = () => {
	return (
		<div className="flex flex-col items-center justify-center h-[500px] border rounded-lg p-8">
			{/* Icon */}
			<div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
				<Shield className="w-8 h-8 text-blue-600" />
			</div>

			{/* Message */}
			<h3 className="text-lg font-medium mb-2">Authentication Required</h3>
			<p className="text-sm text-gray-500 text-center mb-8 max-w-md">
				Please sign in to upload and optimize your resume with our AI-powered
				tools.
			</p>

			{/* Buttons */}
			<div className="space-y-3 w-full max-w-xs">
				<SignInButton mode="modal">
					<Button className="w-full" size="lg">
						<LogIn className="w-4 h-4 mr-2" />
						Sign In
					</Button>
				</SignInButton>

				<SignUpButton mode="modal">
					<Button variant="outline" className="w-full" size="lg">
						<UserPlus className="w-4 h-4 mr-2" />
						Create Account
					</Button>
				</SignUpButton>
			</div>
		</div>
	);
};

export default AuthRequiredState;
