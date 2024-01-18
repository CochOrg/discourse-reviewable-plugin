import {ajax} from "discourse/lib/ajax";
import {withPluginApi} from "discourse/lib/plugin-api";
import {cook} from "discourse/lib/text";

let updateReviewable = data => {
  let reviewableId = data.reviewable_id;
  let reviewableMapItems = document.querySelectorAll('.reviewable-map-item');
  let reviewableItems = document.querySelectorAll('.reviewable-item');
  let reviewableKey = null;

  for (let i = 0; i < reviewableMapItems.length; i++){
    if (+reviewableMapItems[i].dataset.reviewableId === reviewableId){
      reviewableKey = i;
      break;
    }
  }

  if (reviewableKey !== null && reviewableItems[reviewableKey]) {
    if (data.action === 'edit'){
      ajax(`/updated-reviewable/${reviewableId}`)
        .then(async (response) => {
          if (response?.reviewable_queued_post?.payload?.raw) {
            let reviewableBody = reviewableItems[reviewableKey].querySelector('.post-body div');
            reviewableBody.innerHTML = await cook(response.reviewable_queued_post.payload.raw);
          }
        });
    }
    if (data.action === 'delete'){
      reviewableMapItems[reviewableKey].remove();
      reviewableItems[reviewableKey].remove();
    }
  }
};

export default {
  name: 'init-edit-reviewable-channel',
  after: "message-bus",

  initialize(container) {
    withPluginApi("0.12.1", (api) => {
      api.onPageChange((url, title) => {
        let messageBus = container.lookup("service:message-bus");
        let reviewableUpdateChannel = messageBus.callbacks.find(callback => callback.channel.includes('/reviewable-update'));
        if (reviewableUpdateChannel) {
          messageBus.unsubscribe(reviewableUpdateChannel.channel, reviewableUpdateChannel.func);
        }

        let topicController = container.lookup("controller:topic");
        let topic = topicController.get('model');
        if (topic) {
          messageBus.subscribe(`/reviewable-update/${topic.get('id')}`, updateReviewable);
        }
      });
    });
  }
};
