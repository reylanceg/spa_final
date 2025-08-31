document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('cedar-video');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playPauseControl = document.getElementById('play-pause-control');
    const playIcon = document.querySelector('.play-icon');
    const pauseIcon = document.querySelector('.pause-icon');
    const playIconSmall = document.querySelector('.play-icon-small');
    const pauseIconSmall = document.querySelector('.pause-icon-small');
    const videoOverlay = document.querySelector('.video-overlay');
    const videoControls = document.querySelector('.video-controls');
    const seekBar = document.getElementById('seek-bar');
    const currentTimeSpan = document.getElementById('current-time');
    const durationSpan = document.getElementById('duration');
    const muteBtn = document.getElementById('mute-btn');
    const volumeIcon = document.querySelector('.volume-icon');
    const muteIcon = document.querySelector('.mute-icon');
    const volumeBar = document.getElementById('volume-bar');
    const fullscreenBtn = document.getElementById('fullscreen-btn');

    if (!video) return;

    let controlsTimeout;

    // Format time helper
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Show overlay when video is paused or ended
    function showOverlay() {
        videoOverlay.classList.remove('hidden');
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }

    // Hide overlay when video is playing
    function hideOverlay() {
        videoOverlay.classList.add('hidden');
    }

    // Show controls
    function showControls() {
        videoControls.classList.add('show');
        clearTimeout(controlsTimeout);
        controlsTimeout = setTimeout(() => {
            if (!video.paused && !video.ended) {
                hideControls();
            }
        }, 3000);
    }

    // Hide controls
    function hideControls() {
        videoControls.classList.remove('show');
    }

    // Update play/pause icons
    function updatePlayPauseIcons(isPlaying) {
        if (isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            playIconSmall.style.display = 'none';
            pauseIconSmall.style.display = 'block';
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            playIconSmall.style.display = 'block';
            pauseIconSmall.style.display = 'none';
        }
    }

    // Toggle play/pause
    function togglePlayPause() {
        if (video.paused || video.ended) {
            video.play();
        } else {
            video.pause();
        }
    }

    // Update seek bar and time
    function updateProgress() {
        if (video.duration) {
            const progress = (video.currentTime / video.duration) * 100;
            seekBar.value = progress;
            currentTimeSpan.textContent = formatTime(video.currentTime);
        }
    }

    // Seek video
    function seekVideo() {
        if (video.duration) {
            const seekTime = (seekBar.value / 100) * video.duration;
            video.currentTime = seekTime;
        }
    }

    // Toggle mute
    function toggleMute() {
        video.muted = !video.muted;
        volumeIcon.style.display = video.muted ? 'none' : 'block';
        muteIcon.style.display = video.muted ? 'block' : 'none';
        volumeBar.value = video.muted ? 0 : video.volume * 100;
    }

    // Update volume
    function updateVolume() {
        video.volume = volumeBar.value / 100;
        video.muted = video.volume === 0;
        volumeIcon.style.display = video.muted ? 'none' : 'block';
        muteIcon.style.display = video.muted ? 'block' : 'none';
    }

    // Toggle fullscreen
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            video.requestFullscreen().catch(err => {
                console.log('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    // Event listeners
    if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
    if (playPauseControl) playPauseControl.addEventListener('click', togglePlayPause);
    if (seekBar) seekBar.addEventListener('input', seekVideo);
    if (muteBtn) muteBtn.addEventListener('click', toggleMute);
    if (volumeBar) volumeBar.addEventListener('input', updateVolume);
    if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);

    // Video event listeners
    video.addEventListener('loadedmetadata', function() {
        durationSpan.textContent = formatTime(video.duration);
        seekBar.max = 100;
    });

    video.addEventListener('timeupdate', updateProgress);

    video.addEventListener('play', function() {
        updatePlayPauseIcons(true);
        hideOverlay();
        showControls();
    });

    video.addEventListener('pause', function() {
        updatePlayPauseIcons(false);
        showOverlay();
        showControls();
    });

    video.addEventListener('ended', function() {
        updatePlayPauseIcons(false);
        showOverlay();
        showControls();
    });

    // Mouse interactions
    video.addEventListener('click', function() {
        togglePlayPause();
    });

    video.addEventListener('mouseenter', showControls);
    video.addEventListener('mousemove', showControls);

    // Initialize state
    updatePlayPauseIcons(false);
    if (video.paused || video.ended) {
        showOverlay();
    }
});
