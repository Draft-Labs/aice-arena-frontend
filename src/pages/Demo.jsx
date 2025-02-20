import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Demo.css';
import AiceArenaDemo from '../assets/demo/AiceArenaDemo.mp4';

const Demo = () => {
    return (
        <div className="demo-container">
            <h1>Demo</h1>
            <div className="video-wrapper">
                <video 
                    controls
                    autoPlay
                    muted
                    loop
                    className="demo-video"
                >
                    <source src={AiceArenaDemo} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            </div>
            {/*<div className="demo-description">
                <h2>How to Play</h2>
                <p>Watch this quick demo to learn how to play our games.</p>
            </div> */}
        </div>
    );
};

export default Demo;