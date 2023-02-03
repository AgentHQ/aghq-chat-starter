<script>
const speechRecognition = window.SpeechRecognition || webkitSpeechRecognition;

export default {
  name: "App",
  props: {
    debug: {
      type: Boolean,
      default: import.meta.env.DEV,
    },
    appName: {
      type: String,
      default: import.meta.env.VITE_APP_NAME || "Chatbot",
    },
  },
  data() {
    return {
      focused: false,
      prompt: "",
      prompts: [],
      selectedPromptIndex: null,
      loading: false,
      listening: false,
    };
  },
  mounted() {
    window
      .$(this.$refs.microphone)
      .transition("set looping")
      .transition("pulse", "1000ms");

    document.querySelector("title").innerHTML = this.appName;
  },
  computed: {
    selectedPrompt() {
      return this.prompts[this.selectedPromptIndex];
    },
  },
  methods: {
    stopListening() {
      this.listening = false;
      this.recognition.stop();
    },
    listen() {
      if (this.listening) {
        this.stopListening();
        return;
      }
      const $this = this;
      $this.listening = true;
      $this.recognition = new speechRecognition();
      $this.recognition.lang = $this.browserLanguage;

      $this.recognition.start();
      $this.recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        $this.prompt = transcript;
        $this.submitForm(transcript, true);
        $this.listening = false;
      };
    },
    scrollToBottom() {
      this.$nextTick(() => {
        var promptElements = document.querySelectorAll(".prompt");
        if (promptElements.length > 0) {
          promptElements[promptElements.length - 1].scrollIntoView();
        }
      });
    },
    clearPrompts() {
      this.prompts = [];
    },
    submitForm() {
      this.loading = true;
      fetch("/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: this.prompt,
          history: this.prompts,
        }),
      })
        .then((response) => response.json())
        .then((json) => {
          let result = json.result;

          this.prompts.push({
            prompt: this.prompt,
            response: result,
          });
          this.prompt = "";
          this.loading = false;
          this.scrollToBottom();
        });
    },
  },
};
</script>

<template>
  <div class="ui basic segment">
    <div
      v-show="listening"
      class="ui active blurring page inverted content dimmer"
      @click="stopListening"
      style="z-index: 9999000"
    >
      <div class="content">
        <h2 class="ui inverted icon header">
          <i ref="microphone" class="icon microphone red"></i>
        </h2>
      </div>
    </div>
    <div
      style="
        position: sticky;
        top: 0px;
        z-index: 9999;
        padding-top: 2em;
        padding-bottom: 2em;
        background: #fff;
      "
    >
      <h1 class="ui page header">
        <span class="text">{{ appName }}</span>
      </h1>

      <form
        ref="form"
        @submit.prevent="submitForm"
        :class="{ loading }"
        class="ui huge form bottom"
      >
        <div class="field">
          <div class="ui right action left icon input">
            <i class="microphone icon link" @click="listen"></i>
            <input
              type="text"
              ref="input"
              @keydown.esc.stop.prevent="stopListening"
              @keydown.shift.space.exact.stop.prevent="listen"
              @keydown.enter.exact.stop.prevent="submitForm"
              @focus="focused = true"
              @blur="focused = false"
              v-model="prompt"
            />
            <!-- <resize-textarea
              ref="input"
              v-model="prompt"
              @keydown.prevent.enter="submitForm"
              @focus="focused = true"
              class="resize"
              :rows="1"
              :min-height="55"
              style="padding: 0.67857143em 1em"
            ></resize-textarea> -->
            <button type="submit" class="ui button primary">Go!</button>
          </div>
        </div>
      </form>
    </div>

    <div style="margin-top: 2em">
      <table
        v-if="prompts.length > 0"
        class="ui left aligned striped very relaxed table unstackable"
      >
        <template v-for="prompt in prompts">
          <tr class="prompt">
            <td class="collapsing">
              <em data-emoji=":thinking:" class="medium"></em>
            </td>
            <td>
              <p>
                <span v-html="prompt.prompt" class="ui large text"></span>
              </p>
            </td>
          </tr>
          <tr class="hover-parent response">
            <td class="collapsing top aligned">
              <em data-emoji=":robot:" class="medium"></em>
            </td>
            <td class="top aligned">
              <div>
                <p>
                  <span
                    v-html="prompt.response"
                    style="white-space: pre-line"
                    class="ui large text"
                  ></span>
                </p>
              </div>
            </td>
          </tr>
        </template>
      </table>

      <button
        v-if="prompts.length > 0"
        @click="clearPrompts"
        class="ui tertiary icon button"
      >
        <i class="icon undo"></i>
        Start over
      </button>
    </div>
  </div>
</template>

<style scoped>
p {
  line-height: 3em;
}

a.hovering {
  visibility: hidden;
}

.hover-parent:hover a.hovering {
  visibility: visible;
}

textarea.resize {
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}
</style>
