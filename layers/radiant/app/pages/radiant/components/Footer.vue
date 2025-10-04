<script setup lang="ts">
</script>

<template>
  <footer>
    <div class="relative bg-linear-115 from-[#fff1be] from-28% via-[#ee87cb] via-70% to-[#b060ff] sm:bg-linear-145">
      <div class="absolute inset-2 rounded-4xl bg-white/80" />
      <div class="wrapper">
        <!-- #region call to action -->
        <div class="relative pt-20 pb-16 text-center sm:py-24">
          <hgroup>
            <h2 class="text-xs/5 font-semibold tracking-widest uppercase">
              Get started
            </h2>
            <p class="mt-6 text-3xl font-medium tracking-tight text-gray-950 sm:text-5xl">
              Ready to dive in?
              <br>
              Start your free trial today.
            </p>
          </hgroup>
          <p class="mx-auto mt-6 max-w-xs text-sm/6 text-gray-500">
            Get the cheat codes for selling and unlock your team&apos;s revenue
            potential.
          </p>
          <div class="mt-6">
            <a class="btn btn-primary w-full rounded-full sm:w-auto" href="#">
              Get started
            </a>
          </div>
        </div>
        <!-- #endregion call to action -->
        <div class="pb-16">
          <div class="relative grid grid-cols-2 gap-y-10 pb-6 lg:grid-cols-6 lg:gap-8">
            <div class="col-span-2 flex">
              <div class="pt-6 lg:pb-6">
                <EpicStackLogo class="size-9" />
              </div>
            </div>
            <!-- #region sitemap -->
            <div class="col-span-2 grid grid-cols-2 gap-x-8 gap-y-12 lg:col-span-4 lg:grid-cols-subgrid lg:pt-6">
              <div>
                <h3 class="text-sm/6 font-medium text-gray-950/50">
                  Product
                </h3>
                <ul class="mt-6 space-y-4 text-sm/6">
                  <li>
                    <a class="font-medium text-gray-950 hover:text-gray-950/75" href="#">Pricing</a>
                  </li>
                  <li>
                    <a class="font-medium text-gray-950 hover:text-gray-950/75" href="#">Analysis</a>
                  </li>
                  <li>
                    <a class="font-medium text-gray-950 hover:text-gray-950/75" href="#">API</a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 class="text-sm/6 font-medium text-gray-950/50">
                  Company
                </h3>
                <ul class="mt-6 space-y-4 text-sm/6">
                  <li class="font-medium text-gray-950 hover:text-gray-950/75">
                    <a href="#">Careers</a>
                  </li>
                  <li class="font-medium text-gray-950 hover:text-gray-950/75">
                    <a href="#">Blog</a>
                  </li>
                  <li class="font-medium text-gray-950 hover:text-gray-950/75">
                    <a href="#">Company</a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 class="text-sm/6 font-medium text-gray-950/50">
                  Support
                </h3>
                <ul class="mt-6 space-y-4 text-sm/6">
                  <li class="font-medium text-gray-950 hover:text-gray-950/75">
                    <a href="#">Help center</a>
                  </li>
                  <li class="font-medium text-gray-950 hover:text-gray-950/75">
                    <a href="#">Community</a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 class="text-sm/6 font-medium text-gray-950/50">
                  Company
                </h3>
                <ul class="mt-6 space-y-4 text-sm/6">
                  <li class="font-medium text-gray-950 hover:text-gray-950/75">
                    <a href="#">Terms of service</a>
                  </li>
                  <li class="font-medium text-gray-950 hover:text-gray-950/75">
                    <a href="#">Privacy policy</a>
                  </li>
                </ul>
              </div>
            </div>
            <!-- #endregion sitemap -->
          </div>
          <div class="relative flex justify-between">
            <!-- copyright -->
            <p class="py-2 text-sm/6 text-gray-950">
              &copy; {{ new Date().getFullYear() }} Radiant Inc.1233333
            </p>
            <!-- #region social links -->
            <div class="flex items-center gap-8 py-3">
              <a
                href="https://facebook.com"
                target="_blank"
                aria-label="Visit us on Facebook" class=" text-gray-950 hover:text-gray-950/75"
              >
                <Icon size="16" name="logos:facebook" />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                aria-label="Visit us on X" class=" text-gray-950 hover:text-gray-950/75"
              >
                <Icon size="16" name="logos:x" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                aria-label="Visit us on LinkedIn" class=" text-gray-950 hover:text-gray-950/75"
              >
                <Icon size="16" name="logos:linkedin-icon" />
              </a>
            </div>
            <!-- #endregion social links -->
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>
