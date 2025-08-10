
//-------------------------------------------------------
// State
//-------------------------------------------------------
const state = {
    category: 'sfw',
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
    startDragY: 0
};

//-------------------------------------------------------
// DOM Elements
//-------------------------------------------------------
const imageContainer = document.getElementById('image-container');
const loadingWrapper = document.getElementById('loading-wrapper');
const progressBar = document.getElementById('progress-bar');
const errorMessage = document.getElementById('error-message');
const allButtons = document.querySelectorAll('.control-button');
const sfwButton = document.getElementById('btn-sfw');
const nsfwButton = document.getElementById('btn-nsfw');
const bgImage1 = document.getElementById('bg-image-1');
const bgImage2 = document.getElementById('bg-image-2');
const image1 = document.getElementById('image-1');
const image2 = document.getElementById('image-2');
const modalView = document.getElementById('modal-view');
const modalImage = document.getElementById('modal-image');
const modalClose = document.getElementById('modal-close');

//-------------------------------------------------------
// Main App Functions
//-------------------------------------------------------
function setButtonsDisabled(disabled) {
    allButtons.forEach(button => button.disabled = disabled);
}

function showLoadingUI(show) {
    if (show) {
        errorMessage.style.display = 'none';
        loadingWrapper.style.display = 'flex';
        loadingWrapper.style.opacity = 1;
        progressBar.style.width = '0%';
    } else {
        loadingWrapper.style.opacity = 0;
        setTimeout(() => { loadingWrapper.style.display = 'none'; }, 300);
    }
}

function showError(message) {
    if (state.progressInterval) clearInterval(state.progressInterval);
    showLoadingUI(false);
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    imageContainer.style.height = '150px'; // Fallback height
    state.isLoading = false;
    setButtonsDisabled(false);
}

async function fetchWaifuImage() {
    if (state.isLoading) return;
    state.isLoading = true;

    setButtonsDisabled(true);
    showLoadingUI(true);

    if (!state.isFirstLoad) {
        const oldImgEl = state.activeImage === 1 ? image1 : image2;
        oldImgEl.classList.add('dimmed');
    }

    let progressValue = 0;
    state.progressInterval = setInterval(() => {
        progressValue += Math.random() * 5;
        if (progressValue >= 90) {
            progressValue = 90;
            clearInterval(state.progressInterval);
        }
        progressBar.style.width = progressValue + '%';
    }, 100);

    try {
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 10000));
        const response = await Promise.race([fetch(`https://api.waifu.pics/${state.category}/waifu`), timeout]);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        
        state.currentImageUrl = data.url;
        const img = new Image();
        img.src = state.currentImageUrl;

        img.onload = () => {
            if (state.progressInterval) clearInterval(state.progressInterval);
            progressBar.style.width = '100%';
            
            const oldImgEl = state.activeImage === 1 ? image1 : image2;
            const newImgEl = state.activeImage === 1 ? image2 : image1;

            newImgEl.src = img.src;

            newImgEl.onload = () => {
                const newHeight = (newImgEl.naturalHeight / newImgEl.naturalWidth) * imageContainer.clientWidth;
                imageContainer.style.height = `${newHeight}px`;

                oldImgEl.classList.remove('dimmed');

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
            newImgEl.onerror = () => { showError('Failed to display image.'); };
        };

        img.onerror = () => { showError('Failed to load image.'); };

    } catch (error) {
        console.error('Error:', error);
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
    sfwButton.classList.toggle('active', newCategory === 'sfw');
    nsfwButton.classList.toggle('active', newCategory === 'nsfw');
    fetchWaifuImage();
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
    modalView.classList.add('active');
}

function closeModal() {
    modalView.classList.remove('active');
}

//-------------------------------------------------------
// Event Listeners
//-------------------------------------------------------
document.getElementById('randomize-button').addEventListener('click', fetchWaifuImage);
sfwButton.addEventListener('click', () => handleCategoryChange('sfw'));
nsfwButton.addEventListener('click', () => handleCategoryChange('nsfw'));
document.addEventListener('DOMContentLoaded', fetchWaifuImage);

// Modal Listeners
imageContainer.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);
modalView.addEventListener('click', (e) => {
    if (e.target === modalView) {
        closeModal();
    }
});

modalImage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const scaleAmount = 0.1;
    if (e.deltaY < 0) {
        state.scale += scaleAmount;
    } else {
        state.scale -= scaleAmount;
    }
    state.scale = Math.min(Math.max(0.5, state.scale), 5); // Clamp scale
    applyModalTransform();
});

modalImage.addEventListener('mousedown', (e) => {
    e.preventDefault();
    state.isDragging = true;
    state.startDragX = e.clientX - state.translateX;
    state.startDragY = e.clientY - state.translateY;
    modalImage.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', (e) => {
    if (!state.isDragging) return;
    e.preventDefault();
    state.translateX = e.clientX - state.startDragX;
    state.translateY = e.clientY - state.startDragY;
    applyModalTransform();
});

window.addEventListener('mouseup', (e) => {
    if (!state.isDragging) return;
    state.isDragging = false;
    modalImage.style.cursor = 'grab';
});
