/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import VolumeOffIcon from '@material-ui/icons/VolumeOff';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import CircularProgress from '@material-ui/core/CircularProgress';
import FileProgress from '../../Viewer/FileProgress';
import MediaStatus from './MediaStatus';
import { getFileSize, getSrc } from '../../../Utils/File';
import { isBlurredThumbnail } from '../../../Utils/Media';
import { getVideoDurationString } from '../../../Utils/Common';
import { PHOTO_DISPLAY_SIZE, PHOTO_SIZE } from '../../../Constants';
import PlayerStore from '../../../Stores/PlayerStore';
import FileStore from '../../../Stores/FileStore';
import MessageStore from '../../../Stores/MessageStore';
import ApplicationStore from '../../../Stores/ApplicationStore';
import './VideoNote.css';

const circleStyle = {
    circle: 'video-note-progress-circle'
};

class VideoNote extends React.Component {
    constructor(props) {
        super(props);

        this.videoRef = React.createRef();

        const { chatId, messageId } = props;
        const { video } = props.videoNote;

        const { time, message, videoStream } = PlayerStore;
        const active = message && message.chat_id === chatId && message.id === messageId;

        this.state = {
            active: active,
            srcObject: active ? videoStream : null,
            src: getSrc(video),
            currentTime: active && time ? time.currentTime : 0.0,
            videoDuration: active && time ? time.duration : 0.0
        };
    }

    updateVideoSrc() {
        const { srcObject, src } = this.state;

        const player = this.videoRef.current;
        if (!player) return;

        if (srcObject) {
            player.scr = null;
            player.srcObject = srcObject;
            //player.play();
            return;
        }

        player.srcObject = null;
        player.src = src;
        //player.play();
    }

    componentDidMount() {
        this.updateVideoSrc();

        FileStore.on('clientUpdateVideoNoteThumbnailBlob', this.onClientUpdateVideoNoteThumbnailBlob);
        FileStore.on('clientUpdateVideoNoteBlob', this.onClientUpdateVideoNoteBlob);

        MessageStore.on('clientUpdateMessagesInView', this.onClientUpdateMessagesInView);

        ApplicationStore.on('clientUpdateFocusWindow', this.onClientUpdateFocusWindow);

        PlayerStore.on('clientUpdateMediaActive', this.onClientUpdateMediaActive);
        PlayerStore.on('clientUpdateMediaCaptureStream', this.onClientUpdateMediaCaptureStream);
        PlayerStore.on('clientUpdateMediaTimeUpdate', this.onClientUpdateMediaTimeUpdate);
        PlayerStore.on('clientUpdateMediaEnd', this.onClientUpdateMediaEnd);
    }

    componentWillUnmount() {
        FileStore.removeListener('clientUpdateVideoNoteThumbnailBlob', this.onClientUpdateVideoNoteThumbnailBlob);
        FileStore.removeListener('clientUpdateVideoNoteBlob', this.onClientUpdateVideoNoteBlob);

        MessageStore.removeListener('clientUpdateMessagesInView', this.onClientUpdateMessagesInView);

        ApplicationStore.removeListener('clientUpdateFocusWindow', this.onClientUpdateFocusWindow);

        PlayerStore.removeListener('clientUpdateMediaActive', this.onClientUpdateMediaActive);
        PlayerStore.removeListener('clientUpdateMediaCaptureStream', this.onClientUpdateMediaCaptureStream);
        PlayerStore.removeListener('clientUpdateMediaTimeUpdate', this.onClientUpdateMediaTimeUpdate);
        PlayerStore.removeListener('clientUpdateMediaEnd', this.onClientUpdateMediaEnd);
    }

    onClientUpdateMessagesInView = update => {
        const player = this.videoRef.current;
        if (player) {
            const { chatId, messageId } = this.props;
            const key = `${chatId}_${messageId}`;

            if (update.messages.has(key)) {
                //console.log('clientUpdateMessagesInView play message_id=' + messageId);
                player.play();
            } else {
                //console.log('clientUpdateMessagesInView pause message_id=' + messageId);
                player.pause();
            }
        }
    };

    onClientUpdateMediaCaptureStream = update => {
        const { chatId, messageId } = this.props;
        if (chatId === update.chatId && messageId === update.messageId) {
            const player = this.videoRef.current;
            if (player) {
                this.setState({ srcObject: update.stream }, () => {
                    this.updateVideoSrc();
                });
            }
        }
    };

    onClientUpdateMediaTimeUpdate = update => {
        const { chatId, messageId } = this.props;
        if (chatId === update.chatId && messageId === update.messageId) {
            const player = this.videoRef.current;
            if (player) {
                this.setState({
                    currentTime: update.currentTime,
                    videoDuration: update.duration
                });
            }
        }
    };

    onClientUpdateMediaEnd = update => {
        const { chatId, messageId } = this.props;

        if (chatId === update.chatId && messageId === update.messageId) {
            this.setState(
                {
                    active: false,
                    srcObject: null,
                    currentTime: 0.0
                },
                () => {
                    const player = this.videoRef.current;
                    if (!player) return;

                    this.updateVideoSrc();

                    if (!window.hasFocus) {
                        player.pause();
                    }
                }
            );
        }
    };

    onClientUpdateFocusWindow = update => {
        const player = this.videoRef.current;
        if (player) {
            if (this.state.active) {
                return;
            }

            if (update.focused) {
                player.play();
            } else {
                player.pause();
            }
        }
    };

    onClientUpdateMediaActive = update => {
        const { chatId, messageId } = this.props;
        const { video } = this.props.videoNote;

        if (chatId === update.chatId && messageId === update.messageId) {
            if (this.state.active) {
            } else {
                this.setState({
                    active: true,
                    currentTime: null
                });
            }
        } else if (this.state.active) {
            this.setState(
                {
                    active: false,
                    srcObject: null,
                    currentTime: 0
                },
                () => {
                    const player = this.videoRef.current;
                    if (!player) return;

                    this.updateVideoSrc();

                    if (!window.hasFocus) {
                        player.pause();
                    }
                }
            );
        }
    };

    onClientUpdateVideoNoteBlob = update => {
        const { video } = this.props.videoNote;
        const { fileId } = update;

        if (!video) return;

        if (video.id === fileId) {
            this.setState(
                {
                    src: getSrc(video)
                },
                () => {
                    this.updateVideoSrc();
                }
            );
        }
    };

    onClientUpdateVideoNoteThumbnailBlob = update => {
        const { thumbnail } = this.props.videoNote;
        if (!thumbnail) return;

        const { fileId } = update;

        if (thumbnail.photo && thumbnail.photo.id === fileId) {
            this.forceUpdate();
        }
    };

    render() {
        const { displaySize, chatId, messageId, openMedia } = this.props;
        const { active, currentTime, videoDuration } = this.state;
        const { thumbnail, video, duration } = this.props.videoNote;

        const message = MessageStore.get(chatId, messageId);
        if (!message) return null;

        const style = { width: 200, height: 200 };
        if (!style) return null;

        const thumbnailSrc = getSrc(thumbnail ? thumbnail.photo : null);
        const src = getSrc(video);
        const isBlurred = isBlurredThumbnail(thumbnail);

        let progress = 0;
        if (videoDuration && currentTime) {
            const progressTime = currentTime + 0.25;
            progress = (progressTime / videoDuration) * 100;
        }

        return (
            <div
                className={classNames('video-note', { 'video-note-playing': active })}
                style={style}
                onClick={openMedia}>
                {src ? (
                    <>
                        <video
                            ref={this.videoRef}
                            className={classNames('media-viewer-content-image', 'video-note-round')}
                            poster={thumbnailSrc}
                            muted
                            loop
                            autoPlay
                            playsInline
                            width={style.width}
                            height={style.height}
                        />
                        <div className='video-note-player'>
                            <div className='video-note-progress'>
                                <CircularProgress
                                    classes={circleStyle}
                                    variant='static'
                                    value={progress}
                                    size={200}
                                    thickness={1}
                                />
                            </div>
                            <div className='animation-meta'>
                                {getVideoDurationString(active ? Math.floor(currentTime) : duration)}
                                <MediaStatus chatId={chatId} messageId={messageId} icon={' •'} />
                            </div>
                            <div className='video-note-muted'>
                                <VolumeOffIcon />
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className='video-note-round'>
                            <img
                                className={classNames('animation-preview', { 'media-blurred': isBlurred })}
                                style={style}
                                src={thumbnailSrc}
                                alt=''
                            />
                        </div>
                        <div className='animation-meta'>
                            {getVideoDurationString(duration) + ' ' + getFileSize(video)}
                            <MediaStatus chatId={chatId} messageId={messageId} icon={' •'} />
                        </div>
                        <div className='video-note-muted'>
                            <VolumeOffIcon />
                        </div>
                    </>
                )}
                <FileProgress file={video} download upload cancelButton icon={<ArrowDownwardIcon />} />
            </div>
        );
    }
}

VideoNote.propTypes = {
    chatId: PropTypes.number.isRequired,
    messageId: PropTypes.number.isRequired,
    videoNote: PropTypes.object.isRequired,
    openMedia: PropTypes.func.isRequired,
    size: PropTypes.number,
    displaySize: PropTypes.number
};

VideoNote.defaultProps = {
    size: PHOTO_SIZE,
    displaySize: PHOTO_DISPLAY_SIZE
};

export default VideoNote;
