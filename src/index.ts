import os from "os";
import path from "path";

import webpack from "webpack";
import { ResolverRequest } from "enhanced-resolve/lib/common-types";
import { Hook, Tapable } from "tapable";

interface Resolver {
    hooks: {
        file: Hook<ResolverRequest, {}, Tapable.CallbackFunction>;
    };
}

class ModuleScopePlugin implements webpack.ResolvePlugin {
    sources: { [requestingPath: string]: string[] };

    constructor(sources: { [requestingPath: string]: string[] }) {
        this.sources = sources;
    }

    apply(resolver: Resolver) {
        resolver.hooks.file.tapAsync(
            'ModuleScopePlugin',
            (request: ResolverRequest, _, callback: Tapable.CallbackFunction) => {
                this.apply$(request)
                    .then(() => callback())
                    .catch(error => {
                        Object.defineProperty(error, '__module_scope_plugin', {
                            value: true,
                            writable: false,
                            enumerable: false,
                        });
                        callback(error, request);
                    });
            }
        );
    }

    async apply$(request: ResolverRequest): Promise<void> {
        // Unknown issuer, probably webpack internals
        const issuer = request.context.issuer;
        if (!issuer) {
            return;
        }

        // If this resolves to a node_module, we don't care what happens next
        if (request.descriptionFileRoot && (request.descriptionFileRoot.indexOf('/node_modules/') !== -1 || request.descriptionFileRoot.indexOf('\\node_modules\\') !== -1)) {
            return;
        }

        // Make sure this request was manual
        if (!request.__innerRequest_request) {
            return;
        }

        const rootSource = Object.keys(this.sources).find(source => {
            const p = path.relative(source, issuer);
            return !p.startsWith('../') && !p.startsWith('..\\');
        });
        if (!rootSource) {
            throw new Error(`Cannot find the root directory for this file ${issuer}`);
        }

        const requestFullPath = path.resolve(
            path.dirname(issuer),
            request.__innerRequest_request
        );
        // Find path from src to the requested file
        // Error if in a parent directory of all given appSrcs
        if (
            [rootSource, ...this.sources[rootSource]].every(appSrc => {
                const requestRelative = path.relative(appSrc, requestFullPath);
                return (
                    requestRelative.startsWith('../') ||
                    requestRelative.startsWith('..\\')
                );
            })
        ) {
            throw new Error(
                `You attempted to import ${(
                    request.__innerRequest_request
                )} which falls outside of the ${(
                    rootSource.replace('\\', '/')
                )} directory. ` +
                `Imports outside of ${(
                    rootSource.replace('\\', '/')
                )} must be inside of ${(
                    this.sources[rootSource].join(',')
                )}` +
                os.EOL +
                `You can either move it inside ${(
                    rootSource.replace('\\', '/')
                )} or move it outside to ${(
                    this.sources[rootSource].join(',')
                )}.`
            );
        }
    }
}

export default ModuleScopePlugin;