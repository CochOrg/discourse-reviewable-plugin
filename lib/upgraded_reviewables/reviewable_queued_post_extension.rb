module UpgradedReviewables
  module ReviewableQueuedPostExtension
    def perform_approve_post(performed_by, args)
        created_post = nil
        opts =
          create_options.merge(
            skip_validations: true,
            skip_jobs: true,
            skip_events: true,
            skip_guardian: true,
            created_at: self.created_at
          )
        opts.merge!(guardian: Guardian.new(performed_by)) if performed_by.staff?

        creator = PostCreator.new(target_created_by, opts)
        created_post = creator.create

        unless created_post && creator.errors.blank?
          return create_result(:failure) { |r| r.errors = creator.errors }
        end

        self.target = created_post
        self.topic_id = created_post.topic_id if topic_id.nil?
        save

        UserSilencer.unsilence(target_created_by, performed_by) if target_created_by.silenced?

        StaffActionLogger.new(performed_by).log_post_approved(created_post) if performed_by.staff?

        # Backwards compatibility, new code should listen for `reviewable_transitioned_to`
        DiscourseEvent.trigger(:approved_post, self, created_post)

        Notification.create!(
          notification_type: Notification.types[:post_approved],
          user_id: target_created_by.id,
          data: { post_url: created_post.url }.to_json,
          topic_id: created_post.topic_id,
          post_number: created_post.post_number,
        )

        MessageBus.publish("/user-messages/#{target_created_by.id}", {
          action: 'show_reviewable_published_modal',
          topic_id: created_post.topic_id,
          post_id: created_post.id,
          post_url: created_post.url,
        })

        create_result(:success, :approved) do |result|
          result.created_post = created_post

          # Do sidekiq work outside of the transaction
          result.after_commit = -> do
            creator.enqueue_jobs
            creator.trigger_after_events
          end
        end
      end
  end
end
