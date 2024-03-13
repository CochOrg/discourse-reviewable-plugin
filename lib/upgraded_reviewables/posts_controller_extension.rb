# frozen_string_literal: true

module UpgradedReviewables
  module PostsControllerExtension
    def create
        manager_params = create_params
        manager_params[:first_post_checks] = !is_api?
        manager_params[:advance_draft] = !is_api?

        manager = NewPostManager.new(current_user, manager_params)

        json =
          if is_api?
            memoized_payload =
              DistributedMemoizer.memoize(signature_for(manager_params), 120) do
                MultiJson.dump(serialize_data(manager.perform, NewPostResultSerializer, root: false))
              end

            JSON.parse(memoized_payload)
          else
            serialize_data(manager.perform, NewPostResultSerializer, root: false)
          end

        topic = Topic.find_by_id(manager_params[:topic_id])
        if topic.private_message?
          topic.allowed_users.each do |au|
            if au.username != "AIAssistant" && au.username != "Mediator" && au.id != current_user["id"]
              if is_api?
                topic_id = json["post"]["topic_id"]
                post_id = json["post"]["id"]
                post_url = "/t/#{json["post"]["topic_slug"]}/#{json["post"]["topic_id"]}/#{json["post"]["post_number"]}"
              else
                topic_id = json[:post][:topic_id]
                post_id = json[:post][:id]
                post_url = "/t/#{json[:post][:topic_slug]}/#{json[:post][:topic_id]}/#{json[:post][:post_number]}"
              end

              MessageBus.publish("/user-messages/#{au.id}", {
                action: 'show_new_private_message',
                topic_id: topic_id,
                post_id: post_id,
                post_url: post_url,
              })
            end
          end
        end

        backwards_compatible_json(json)
      end
  end
end
