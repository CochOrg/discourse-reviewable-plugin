import {ajax} from "discourse/lib/ajax";
import {withPluginApi} from "discourse/lib/plugin-api";
import {cook} from "discourse/lib/text";
import NewReviewableModal from "../components/new-reviewable-modal";
import PushNotifications from "../lib/notifications";

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
  name: 'init-new-reviewable-channels',
  after: "message-bus",

  initialize(container) {
    let notifications = new PushNotifications()
    let messageBusService = container.lookup("service:message-bus");
    withPluginApi("0.12.1", (api) => {
      api.onPageChange((url, title) => {
        let reviewableUpdateChannel = messageBusService.callbacks.find(callback => callback.channel.includes('/reviewable-update'));
        if (reviewableUpdateChannel) {
          messageBusService.unsubscribe(reviewableUpdateChannel.channel, reviewableUpdateChannel.func);
        }

        let topicController = container.lookup("controller:topic");
        let topic = topicController.get('model');
        if (topic) {
          messageBusService.subscribe(`/reviewable-update/${topic.get('id')}`, updateReviewable);
          notifications.removeNotificationsByLink(`/t/${topic.get('slug')}/${topic.get('id')}`)
        }
      });
    });

    let userControllerService = container.lookup("controller:user");
    if (userControllerService?.currentUser?.id){
      messageBusService.subscribe(`/user-messages/${userControllerService.currentUser.id}`, async (data) => {
        if (data.action === 'show_new_reviewable_modal') {
          const response = await ajax(`/updated-reviewable/${data.reviewable_id}`)
          if (response?.reviewable_queued_post?.payload?.raw) {
            let cookedText = await cook(response.reviewable_queued_post.payload.raw);

            const temp = document.createElement('div')
            temp.insertAdjacentHTML('afterbegin', cookedText)
            const bElements = temp.querySelectorAll('b')
            const lastBText  = bElements[bElements.length - 1] ?? ''

            let modalService = container.lookup("service:modal");
            modalService.show(NewReviewableModal, {model: {text: lastBText}});
          }
        }

        if (data.action === 'show_reviewable_published_message') {
          const topic = await ajax(`/t/${data.topic_id}.json`)
          if (!topic?.title){
            return
          }

          const post = await ajax(`/posts/${data.post_id}.json`)
          if (!post?.raw){
            return
          }

          const title = 'Ваш пост опубликован'
          const topicName = topic.title
          const postText = notifications.cutText(post.raw)
          const link = data.post_url
          const text = `Ваше сообщение "${postText}" опубликовано в топике <a class="notification-item__link" href="${link}">"${topicName}"</a>`

          notifications.insertNotificationItem(text, title)
        }

        if (data.action === 'show_new_private_message') {
          const post = await ajax(`/posts/${data.post_id}.json`)
          if (!post?.raw){
            return
          }

          const title = 'Новое сообщение от AI-ассистента или медиатора'
          const postText = notifications.cutText(post.raw)
          const link = data.post_url
          const text = `${postText} <br><br> <a class="notification-item__link" href="${link}">Перейти в диалог</a>`

          notifications.insertNotificationItem(text, title)
        }
      });
    }

    // Event for GA
    document.addEventListener('mousedown', e => {
      const closestCreateBtn = e.target.closest('button.create')
      const replyControl = closestCreateBtn?.closest('#reply-control')
      if (!closestCreateBtn || !replyControl){
        return
      }

      const buttonSpan = closestCreateBtn.querySelector('.d-button-label')
      if (!buttonSpan){
        return;
      }

      buttonSpan.classList.remove('d-button-label')
      replyControl.querySelector('#reply-title')
          ? buttonSpan.classList.add('button-create-topic-success')
          : buttonSpan.classList.add('d-button-label-success')
    })
  }
};
