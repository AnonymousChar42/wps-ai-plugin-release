/**
 * WPS Word 加载项 Ribbon 事件处理
 */

import Util from './js/util.js'

//这个函数在整个wps加载项中是第一个执行的
function OnAddinLoad(ribbonUI){
    if (typeof (window.Application.ribbonUI) != "object"){
        window.Application.ribbonUI = ribbonUI
    }

    if (typeof (window.Application.Enum) != "object") { // 如果没有内置枚举值
        window.Application.Enum = Util.WPS_Enum
    }

    return true
}

function OnAction(control) {
    const eleId = control.Id
    switch (eleId) {
        case "btnShowAi":
            {
                let tsId = window.Application.PluginStorage.getItem("ai_pane_id")
                if (!tsId) {
                    let tskpane = window.Application.CreateTaskPane(Util.GetUrlPath() + Util.GetRouterHash() + "/aipane")
                    let id = tskpane.ID
                    window.Application.PluginStorage.setItem("ai_pane_id", id)
                    tskpane.Visible = true
                } else {
                    let tskpane = window.Application.GetTaskPane(tsId)
                    tskpane.Visible = !tskpane.Visible
                }
            }
            break
        case "btnAgentPane":
            {
                let tsId = window.Application.PluginStorage.getItem("agent_pane_id")
                if (!tsId) {
                    let tskpane = window.Application.CreateTaskPane(Util.GetUrlPath() + Util.GetRouterHash() + "/agentpane")
                    let id = tskpane.ID
                    window.Application.PluginStorage.setItem("agent_pane_id", id)
                    tskpane.Visible = true
                } else {
                    let tskpane = window.Application.GetTaskPane(tsId)
                    tskpane.Visible = !tskpane.Visible
                }
            }
            break
        default:
            break
    }
    return true
}

function GetImage(control) {
    const eleId = control.Id
    switch (eleId) {
        case "btnShowAi":
            return "images/chat-bot-icon.svg"
        case "btnAgentPane":
            return "images/newFromTemp.svg"
        default:
    }
    return "images/newFromTemp.svg"
}

function OnGetEnabled(control) {
    return true
}

function OnGetVisible(control){
    console.log(control.Id)
    return true
}

function OnGetLabel(control){
    return ""
}

function OnNewDocumentApiEvent(doc){
    return true
}

//这些函数是给wps客户端调用的
export default {
    OnAddinLoad,
    OnAction,
    GetImage,
    OnGetEnabled,
    OnGetVisible,
    OnGetLabel,
    OnNewDocumentApiEvent
}
