import { access, symlink } from "node:fs/promises";
import { join } from "node:path";

let userConfig = undefined

try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
      asyncWebAssembly: true,
      layers: true,
    };

    config.cache = false;

    // fix warnings for async functions in the browser (https://github.com/vercel/next.js/issues/64792)
    if (!isServer) {
      config.output.environment = {
        ...config.output.environment,
        asyncFunction: true,
      };
    }

    // Workaround for https://github.com/vercel/next.js/issues/25852
    config.plugins.push(
      new (class {
        apply(compiler) {
          compiler.hooks.afterEmit.tapPromise(
            "SymlinkWebpackPlugin",
            async (compiler) => {
              if (isServer) {
                const from = join(compiler.options.output.path, "../static");
                const to = join(compiler.options.output.path, "static");

                try {
                  await access(from);
                } catch (error) {
                  // Access check failed, need to create symlink
                  if (error.code === "ENOENT") {
                    await symlink(to, from, "junction");
                  } else {
                    console.log(
                      `SymlinkWebpackPlugin: Unexpected failure.  symlink ${from} -> ${to}`,
                    );
                    throw error;
                  }
                }
              }
            },
          );
        }
      })(),
    );

    return config;
  },
}

mergeConfig(nextConfig, userConfig)

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      }
    } else {
      nextConfig[key] = userConfig[key]
    }
  }
}

export default nextConfig
