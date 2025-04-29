use pblog;

CREATE TABLE users (
    user_id Serial PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    profile_picture_url VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE
);

CREATE TABLE channels (
    channel_id Serial PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    channel_name VARCHAR(100) NOT NULL UNIQUE,
    channel_description TEXT,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE videos (
    video_id Serial PRIMARY KEY,
    channel_id INT REFERENCES channels(channel_id) ON DELETE CASCADE,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    video_url VARCHAR(255) NOT NULL,
    thumbnail_url VARCHAR(255),
    views INT DEFAULT 0
);

CREATE TABLE comments (
    comment_id Serial PRIMARY KEY,
    video_id INT REFERENCES videos(video_id) ON DELETE CASCADE,
    user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    comment_text TEXT NOT NULL,
    comment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE video_likes (
    like_id Serial PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    video_id INT REFERENCES videos(video_id) ON DELETE CASCADE,
    like_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, video_id)
);

CREATE TABLE video_dislikes (
    dislike_id Serial PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    video_id INT REFERENCES videos(video_id) ON DELETE CASCADE,
    dislike_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, video_id)
);

CREATE TABLE subscriptions (
    subscription_id Serial PRIMARY KEY,
    subscriber_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    channel_id INT REFERENCES channels(channel_id) ON DELETE CASCADE,
    subscription_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (subscriber_id, channel_id)
);

CREATE TABLE video_views (
    view_id Serial PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    video_id INT REFERENCES videos(video_id) ON DELETE CASCADE,
    view_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE video_access (
    access_id Serial PRIMARY KEY,
    video_id INT REFERENCES videos(video_id) ON DELETE CASCADE,
    access_type VARCHAR(20) NOT NULL CHECK (access_type IN ('public', 'private', 'unlisted')),
    password_hash VARCHAR(255),
    allowed_user_id INT REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE playlists (
    playlist_id Serial PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    playlist_name VARCHAR(100) NOT NULL,
    playlist_description TEXT,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE playlist_videos (
    playlist_video_id Serial PRIMARY KEY,
    playlist_id INT REFERENCES playlists(playlist_id) ON DELETE CASCADE,
    video_id INT REFERENCES videos(video_id) ON DELETE CASCADE,
    added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (playlist_id, video_id)
);