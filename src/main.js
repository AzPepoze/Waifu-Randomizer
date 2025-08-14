//-------------------------------------------------------
// State
//-------------------------------------------------------
const state = {
	category: "sfw",
	selectedApi: "waifu.pics", // New state variable
	activeBg: 1,
	activeImage: 1,
	isLoading: false,
	isFirstLoad: true,
	progressInterval: null,
	currentImageUrl: null,
	// Modal state
	scale: 1,
	translateX: 0,
	translateY: 0,
	isDragging: false,
	startDragX: 0,
	startDragY: 0,
};

//-------------------------------------------------------
// DOM Elements
//-------------------------------------------------------
const imageContainer = document.getElementById("image-container");
const btnWaifuPics = document.getElementById("btn-waifu-pics");
const btnWaifuIm = document.getElementById("btn-waifu-im");
const btnNekosBest = document.getElementById("btn-nekos-best"); // New DOM element
const btnDanbooruAnime = document.getElementById("btn-danbooru-anime"); // New DOM element
const loadingWrapper = document.getElementById("loading-wrapper");
const progressBar = document.getElementById("progress-bar");
const errorMessage = document.getElementById("error-message");
const allButtons = document.querySelectorAll(".control-button");
const sfwButton = document.getElementById("btn-sfw");
const nsfwButton = document.getElementById("btn-nsfw");
const bgImage1 = document.getElementById("bg-image-1");
const bgImage2 = document.getElementById("bg-image-2");
const image1 = document.getElementById("image-1");
const image2 = document.getElementById("image-2");
const modalView = document.getElementById("modal-view");
const modalImage = document.getElementById("modal-image");
const modalClose = document.getElementById("modal-close");

//-------------------------------------------------------
// Helper Functions
//-------------------------------------------------------
function updateImageContainerHeight(imgElement) {
	const containerWidth = imageContainer.clientWidth;
	const containerMaxHeight = parseFloat(window.getComputedStyle(imageContainer).maxHeight);

	const imgNaturalWidth = imgElement.naturalWidth;
	const imgNaturalHeight = imgElement.naturalHeight;

	if (imgNaturalWidth === 0 || imgNaturalHeight === 0) {
		imageContainer.style.height = `auto`;
		return;
	}

	const imgAspectRatio = imgNaturalWidth / imgNaturalHeight;

	let finalWidth = containerWidth;
	let finalHeight = containerWidth / imgAspectRatio;

	// If the calculated height exceeds the container's max-height, adjust based on max-height
	if (!isNaN(containerMaxHeight) && finalHeight > containerMaxHeight) {
		finalHeight = containerMaxHeight;
		finalWidth = containerMaxHeight * imgAspectRatio;
	}

	// Ensure the final width does not exceed the container's width
	if (finalWidth > containerWidth) {
		finalWidth = containerWidth;
		finalHeight = containerWidth / imgAspectRatio;
	}

	imageContainer.style.height = `${finalHeight}px`;
}

//-------------------------------------------------------
// Main App Functions
//-------------------------------------------------------
function setButtonsDisabled(disabled) {
	allButtons.forEach((button) => (button.disabled = disabled));
}

function showLoadingUI(show) {
	if (show) {
		errorMessage.style.display = "none";
		loadingWrapper.style.display = "flex";
		loadingWrapper.style.opacity = 1;
		progressBar.style.width = "0%";
	} else {
		loadingWrapper.style.opacity = 0;
		setTimeout(() => {
			loadingWrapper.style.display = "none";
		}, 300);
	}
}

function showError(message) {
	if (state.progressInterval) clearInterval(state.progressInterval);
	showLoadingUI(false);
	errorMessage.textContent = message;
	errorMessage.style.display = "block";
	imageContainer.style.height = "auto"; // Changed from 150px
	state.isLoading = false;
	setButtonsDisabled(false);
}

async function fetchImageFromNekosBest(category) {
	if (category === "nsfw") {
		throw new Error("Nekos.best API does not support NSFW images.");
	}
	const response = await fetch("https://nekos.best/api/v2/waifu"); // Using v2 and 'waifu' category
	if (!response.ok) throw new Error(`Nekos.best API error: ${response.status}`);
	const data = await response.json();
	if (!data.results || data.results.length === 0) throw new Error("No images found from Nekos.best");
	return data.results[0].url;
}

async function fetchImageFromWaifuIm(category) {
	const isNsfw = category === "nsfw";
	const tags = isNsfw ? "waifu" : "waifu"; // Default tags, can be expanded later
	const url = `https://api.waifu.im/search?included_tags=${tags}&is_nsfw=${isNsfw}`;

	const response = await fetch(url);
	if (!response.ok) throw new Error(`Waifu.im API error: ${response.status}`);
	const data = await response.json();
	if (!data.images || data.images.length === 0) throw new Error("No images found from Waifu.im");
	return data.images[0].url;
}

async function fetchImageFromDanbooruAnime(category) {
	// Danbooru API is complex and often requires API keys for extensive use.
	// For a simple random image, we can try to fetch a random post.
	// Note: Danbooru has a lot of NSFW content. Filtering by SFW tags is crucial.
	// This is a simplified approach and might not always return a suitable image.

	const endpoint = category === "sfw"
		? `https://danbooru.donmai.us/posts.json?limit=1&random=true&tags=rating:safe`
		: `https://danbooru.donmai.us/posts.json?limit=1&random=true&tags=is%3Ansfw`;

	const response = await fetch(endpoint);
	if (!response.ok) throw new Error(`Danbooru Anime API error: ${response.status}`);
	const data = await response.json();

	if (!data || data.length === 0 || !data[0].file_url) {
		throw new Error("No image found from Danbooru Anime API");
	}
	return data[0].file_url;
}

async function fetchWaifuImage() {
	if (state.isLoading) return;
	state.isLoading = true;

	setButtonsDisabled(true);
	showLoadingUI(true);

	if (!state.isFirstLoad) {
		const oldImgEl = state.activeImage === 1 ? image1 : image2;
		oldImgEl.classList.add("dimmed");
	}

	let progressValue = 0;
	state.progressInterval = setInterval(() => {
		progressValue += Math.random() * 5;
		if (progressValue >= 90) {
			progressValue = 90;
			clearInterval(state.progressInterval);
		}
		progressBar.style.width = progressValue + "%";
	}, 100);

	try {
		const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), 10000));
		let imageUrl;

		if (state.selectedApi === "waifu.pics") {
			const response = await Promise.race([fetch(`https://api.waifu.pics/${state.category}/waifu`), timeout]);
			if (!response.ok) throw new Error(`Waifu.pics API error: ${response.status}`);
			const data = await response.json();
			imageUrl = data.url;
		} else if (state.selectedApi === "waifu.im") {
			imageUrl = await Promise.race([fetchImageFromWaifuIm(state.category), timeout]);
		} else if (state.selectedApi === "nekos.best") {
			// New condition
			imageUrl = await Promise.race([fetchImageFromNekosBest(state.category), timeout]);
		} else if (state.selectedApi === "danbooru.anime") {
			// New condition for Danbooru Anime API
			imageUrl = await Promise.race([fetchImageFromDanbooruAnime(state.category), timeout]);
		} else {
			throw new Error("Invalid API selected.");
		}

		state.currentImageUrl = imageUrl;
		const img = new Image();
		img.src = state.currentImageUrl;

		img.onload = () => {
			if (state.progressInterval) clearInterval(state.progressInterval);
			progressBar.style.width = "100%";

			const oldImgEl = state.activeImage === 1 ? image1 : image2;
			const newImgEl = state.activeImage === 1 ? image2 : image1;

			newImgEl.src = img.src;

			newImgEl.onload = () => {
				updateImageContainerHeight(newImgEl);
				oldImgEl.classList.remove("dimmed");

				if (state.isFirstLoad) {
					newImgEl.style.opacity = 1;
					state.isFirstLoad = false;
				} else {
					oldImgEl.style.opacity = 0;
					newImgEl.style.opacity = 1;
				}

				state.activeImage = state.activeImage === 1 ? 2 : 1;
				updateBgAndFinalize(img.src);
			};
			newImgEl.onerror = () => {
				showError("Failed to display image.");
			};
		};

		img.onerror = () => {
			showError("Failed to load image.");
		};
	} catch (error) {
		console.error("Error:", error);
		showError(`Error: ${error.message}`);
	}
}

function updateBgAndFinalize(newSrc) {
	const inactiveBg = state.activeBg === 1 ? bgImage2 : bgImage1;
	inactiveBg.style.backgroundImage = `url(${newSrc})`;

	const activeBgEl = state.activeBg === 1 ? bgImage1 : bgImage2;
	const inactiveBgEl = state.activeBg === 1 ? bgImage2 : bgImage1;
	activeBgEl.style.opacity = 0;
	inactiveBgEl.style.opacity = 1;
	state.activeBg = state.activeBg === 1 ? 2 : 1;

	setTimeout(() => {
		showLoadingUI(false);
		state.isLoading = false;
		setButtonsDisabled(false);
	}, 500);
}

function handleCategoryChange(newCategory) {
	if (state.isLoading || state.category === newCategory) return;
	state.category = newCategory;
	sfwButton.classList.toggle("active", newCategory === "sfw");
	nsfwButton.classList.toggle("active", newCategory === "nsfw");
	updateApiButtonStates(); // Call to update button states
	fetchWaifuImage();
}

function updateApiButtonStates() {
	const currentCategory = state.category;

	// Define which APIs support which categories
	const apiSupport = {
		"waifu.pics": { sfw: true, nsfw: true },
		"waifu.im": { sfw: true, nsfw: true },
		"nekos.best": { sfw: true, nsfw: false }, // Nekos.best does not support NSFW
		"danbooru.anime": { sfw: true, nsfw: true }, // Danbooru supports both, but filtering is important
	};

	let shouldChangeApi = false;

	allButtons.forEach((button) => {
		const apiId = button.id.replace("btn-", "");
		const apiName = apiId.replace("-", "."); // Convert btn-waifu-pics to waifu.pics

		if (apiSupport[apiName]) {
			const supportsCategory = apiSupport[apiName][currentCategory];
			button.disabled = !supportsCategory;

			if (state.selectedApi === apiName && !supportsCategory) {
				shouldChangeApi = true;
			}
		} else {
			// If API support is not defined, assume it supports all or handle as needed
			button.disabled = false;
		}
	});

	if (shouldChangeApi) {
		// Find a supported API to switch to
		let newSelectedApi = "waifu.pics"; // Default fallback
		for (const api in apiSupport) {
			if (apiSupport[api][currentCategory]) {
				newSelectedApi = api;
				break;
			}
		}
		// Update the state and UI for the new API
		state.selectedApi = newSelectedApi;
		// Manually update active class for the new selected API button
		document.querySelectorAll("#api-selector .category-button").forEach((btn) => {
			btn.classList.remove("active");
		});
		document.getElementById(`btn-${newSelectedApi.replace(".", "-")}`).classList.add("active");
		// Optionally, show a message to the user that the API was changed
		console.warn(
			`Switched to ${newSelectedApi} because the previously selected API does not support ${currentCategory}.`
		);
	}
}

//-------------------------------------------------------
// Modal (Zoom & Pan) Functions
//-------------------------------------------------------
function applyModalTransform() {
	modalImage.style.transform = `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`;
}

function openModal() {
	if (state.isLoading || !state.currentImageUrl) return;
	modalImage.src = state.currentImageUrl;
	state.scale = 1;
	state.translateX = 0;
	state.translateY = 0;
	applyModalTransform();
	modalView.classList.add("active");
}

function closeModal() {
	modalView.classList.remove("active");
}

//-------------------------------------------------------
// Event Listeners
//-------------------------------------------------------
document.getElementById("randomize-button").addEventListener("click", fetchWaifuImage);
sfwButton.addEventListener("click", () => handleCategoryChange("sfw"));
nsfwButton.addEventListener("click", () => handleCategoryChange("nsfw"));
document.addEventListener("DOMContentLoaded", () => {
	updateApiButtonStates(); // Initial call to set button states
	fetchWaifuImage();
});

// Modal Listeners
imageContainer.addEventListener("click", openModal);
modalClose.addEventListener("click", closeModal);
modalView.addEventListener("click", (e) => {
	if (e.target === modalView) {
		closeModal();
	}
});

function handleApiChange(newApi) {
	if (state.isLoading || state.selectedApi === newApi) return;
	state.selectedApi = newApi;
	btnWaifuPics.classList.toggle("active", newApi === "waifu.pics");
	btnWaifuIm.classList.toggle("active", newApi === "waifu.im");
	btnNekosBest.classList.toggle("active", newApi === "nekos.best");
	btnDanbooruAnime.classList.toggle("active", newApi === "danbooru.anime");
	updateApiButtonStates(); // Call to update button states
	fetchWaifuImage();
}

// API Selection Listeners
btnWaifuPics.addEventListener("click", () => handleApiChange("waifu.pics"));
btnWaifuIm.addEventListener("click", () => handleApiChange("waifu.im"));
btnNekosBest.addEventListener("click", () => handleApiChange("nekos.best"));
btnDanbooruAnime.addEventListener("click", () => handleApiChange("danbooru.anime"));

fetchWaifuImage();

modalImage.addEventListener("wheel", (e) => {
	e.preventDefault();
	const scaleAmount = 0.1;
	if (e.deltaY < 0) {
		state.scale += scaleAmount;
	} else {
		state.scale -= scaleAmount;
	}
	state.scale = Math.min(Math.max(0.5, state.scale), 5);
	applyModalTransform();
});

modalImage.addEventListener("mousedown", (e) => {
	e.preventDefault();
	state.isDragging = true;
	state.startDragX = e.clientX - state.translateX;
	state.startDragY = e.clientY - state.translateY;
	modalImage.style.cursor = "grabbing";
});

window.addEventListener("mousemove", (e) => {
	if (!state.isDragging) return;
	e.preventDefault();
	state.translateX = e.clientX - state.startDragX;
	state.translateY = e.clientY - state.startDragY;
	applyModalTransform();
});

window.addEventListener("mouseup", (e) => {
	if (!state.isDragging) return;
	state.isDragging = false;
	modalImage.style.cursor = "grab";
});

// Handle resize to adjust image container height
window.addEventListener("resize", () => {
	const currentImgEl = state.activeImage === 1 ? image1 : image2;
	if (currentImgEl.src) {
		updateImageContainerHeight(currentImgEl);
	}
});
