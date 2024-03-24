import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshToken = async (userId) => {
	try {
		const user = User.findById(userId);
		const accessToken = user.generateAccessToken();
		const refreshToken = user.generateRefreshToken();

		user.refreshToken = refreshToken;

		await user.save({ validateBeforeSave: false });

		return { refreshToken, accessToken };
	} catch (error) {
		throw new ApiError(500, "somethign went wrong while generating tokens");
	}
};

const registerUser = asyncHandler(async (req, res) => {
	//get user details from frontend
	//validation - required fields not empty
	//check if user already exists - username,password
	//check for images,check for avatars
	//upload them to cloudinary , avatar check again
	//create user obj - entry in db
	//remove password and refresh token field from response
	//check for user creation
	//return res

	const { fullName, email, username, password } = req.body;
	//console.log("email", email);

	// if (fullName === "") {
	// 	throw new ApiError(400,"fullname is required")
	// }

	if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
		throw new ApiError(400, "All fields are required");
	}

	const existedUser = await User.findOne({
		$or: [{ username }, { email }],
	});

	if (existedUser) {
		throw new ApiError(409, "User with email or username already exists");
	}

	const avatarLocalPath = req.files?.avatar[0]?.path;
	//const coverImageLocalPath = req.files?.coverImage[0]?.path;

	let coverImageLocalPath;
	if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
		coverImageLocalPath = req.files.coverImage[0].path;
	}

	if (!avatarLocalPath) {
		throw new ApiError(400, "Avatar file is required");
	}

	const avatar = await uploadOnCloudinary(avatarLocalPath);
	const coverImage = await uploadOnCloudinary(coverImageLocalPath);

	if (!avatar) {
		throw new ApiError(400, "Avatar is a required field");
	}

	const user = await User.create({
		fullName,
		password,
		email,
		avatar: avatar.url,
		coverImage: coverImage?.url || "",
		username: username.toLowerCase(),
	});

	const createdUser = await User.findById(user._id).select("-password -refreshToken");

	if (!createdUser) {
		throw new ApiError(500, "Something went wrong while registering the user");
	}

	return res.status(201).json(new ApiResponse(200, createdUser, "User created successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
	//req body => data
	//username or email exist
	//find the user
	//password matches or not
	//access and refresh token generate
	//send cookie

	const { email, username, password } = req.body;

	if (username === "" || password === null) {
		throw new ApiError(400, "email and password is required");
	}

	const user = await User.findOne({
		$or: [{ username }, { email }],
	});

	if (!user) {
		throw new ApiError(404, "User does not exist");
	}

	const isPasswordValid = await user.isPasswordCorrect(password);

	if (!isPasswordValid) {
		throw new ApiError(401, "password is incorrect");
	}

	const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

	const loggedInUser = await User.findById(user._id).select("-refreshToken -password");

	const options = {
		httpOnly: true,
		secure: true,
	};

	return res
		.status(200)
		.cookie("accessToken", accessToken, options)
		.cookie("refreshToken", refreshToken, options)
		.json(
			new ApiResponse(
				200,
				{
					user: loggedInUser,
					accessToken,
					refreshToken,
				},
				"User loggedIn successfully"
			)
		);
});

const logoutUser = asyncHandler(async (req, res) => {
	await User.findByIdAndUpdate(
		req.user._id,
		{
			$set: {
				refreshToken: undefined,
			},
		},
		{
			//to return the new updated value
			new: true,
		}
	);
	const options = {
		httpOnly: true,
		secure: true,
	};

	return res
		.status(200)
		.clearCookie("accessToken", options)
		.clearCookie("refreshToken", options)
		.json(new ApiResponse(200, {}, "User logged out"));
});

export { registerUser, loginUser, logoutUser };
