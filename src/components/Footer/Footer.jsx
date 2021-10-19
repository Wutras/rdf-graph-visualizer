import React from 'react'
import { CircularIconButton } from '..'
import "./Footer.css"

export default function Footer({ setView, view }) {
    return (
        <div className="footer">
            <CircularIconButton style={{
                right: "0%",
            }}
            onClick={() => view === "settings" ? setView("main") : setView("settings")}
            />
        </div>
    )
}
