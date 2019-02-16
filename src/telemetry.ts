import { Buffer } from "buffer";
import { extensions, WorkspaceConfiguration } from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import { userInfo } from "os";
import { sep } from "path";

export default class Reporter{
    private reporter: TelemetryReporter
    private timeSpent: number
    private lastException: string
    private lastErrorCode: number

    constructor(private enabled: boolean){
        const extensionId = "almenon.arepl";
        const extension = extensions.getExtension(extensionId)!;
        const extensionVersion = extension.packageJSON.version;

        // following key just allows you to send events to azure insights API
        // so it does not need to be protected
        // but obfuscating anyways - bots scan github for keys, but if you want my key you better work for it, damnit!
        const innocentKitten = Buffer.from("NWYzMWNjNDgtNTA2OC00OGY4LWFjMWMtZDRkY2Y3ZWFhMTM1", "base64").toString()
    
        this.reporter = new TelemetryReporter(extensionId, extensionVersion, innocentKitten);
        this.timeSpent = Date.now()
    }

    sendError(exception: string, code: number = 0){
        if(this.enabled){
            // no point in sending same error twice (and we want to stay under free API limit)
            if(exception == this.lastException && code == this.lastErrorCode) return

            exception = this.anonymizePaths(exception)

            this.reporter.sendTelemetryEvent("error", {
                code: code.toString(),
                exception,
            })

            this.lastErrorCode = code
            this.lastException = exception
        }
    }

    /**
     * we want to collect data on how long the user uses the extension
     * and the settings they use
     */
    sendFinishedEvent(settings: WorkspaceConfiguration){
        if(this.enabled){
            const properties: {[key: string]: string} = {}

            this.timeSpent = Date.now() - this.timeSpent
            properties.timeSpent = this.timeSpent.toString()

            // no idea why I did this but i think there was a reason?
            // this is why you leave comments people
            const settingsDict = JSON.parse(JSON.stringify(settings))            
            for(let key in settingsDict){
                properties[key] = settingsDict[key]
            }
            
            properties['pythonPath'] = this.anonymizePaths(properties['pythonPath'])

            this.reporter.sendTelemetryEvent("closed", properties)
        }
    }

    /**
     * replace username with anon
     */
    anonymizePaths(input:string){
        return input.replace(new RegExp(sep+userInfo().username, 'g'), sep+'anon')
    }

    dispose(){this.reporter.dispose()}
}